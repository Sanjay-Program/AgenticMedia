import type {
  CreatorCreditScore,
  CreditScoreComponents,
  FraudSignal,
  FraudSignalType,
  FraudSignalSeverity,
} from '@agenticmedia/shared-types';
import {
  CREDIT_SCORE_WEIGHTS,
  gradeFromScore,
} from '@agenticmedia/shared-types';

/**
 * Calculates a Creator Credit Score based on multiple signals.
 * This is the "Creator FICO Score" — enterprise agencies use this
 * to assess risk before signing or recommending a creator.
 *
 * @param creatorId - The creator's UUID
 * @param organizationId - The org requesting the score
 * @param metrics - Raw metrics used for scoring
 * @returns CreatorCreditScore with grade and fraud signals
 */
export function calculateCreatorCreditScore(
  creatorId: string,
  organizationId: string,
  metrics: CreditScoreInput
): CreatorCreditScore {
  const components = calculateComponents(metrics);
  const fraudSignals = detectFraudSignals(metrics);

  // Weighted overall score
  const overallScore = Math.round(
    components.paymentReliability * CREDIT_SCORE_WEIGHTS.PAYMENT_RELIABILITY +
    components.campaignReliability * CREDIT_SCORE_WEIGHTS.CAMPAIGN_RELIABILITY +
    components.engagementAuthenticity * CREDIT_SCORE_WEIGHTS.ENGAGEMENT_AUTHENTICITY +
    components.audienceQuality * CREDIT_SCORE_WEIGHTS.AUDIENCE_QUALITY +
    components.growthHealth * CREDIT_SCORE_WEIGHTS.GROWTH_HEALTH
  );

  // Penalty for fraud signals
  const fraudPenalty = fraudSignals.reduce((penalty, signal) => {
    switch (signal.severity) {
      case 'critical': return penalty + 20;
      case 'high': return penalty + 10;
      case 'medium': return penalty + 5;
      case 'low': return penalty + 2;
      default: return penalty;
    }
  }, 0);

  const finalScore = Math.max(0, Math.min(100, overallScore - fraudPenalty));

  return {
    creatorId,
    organizationId,
    overallScore: finalScore,
    grade: gradeFromScore(finalScore),
    components,
    fraudSignals,
    calculatedAt: new Date().toISOString(),
  };
}

export interface CreditScoreInput {
  // Payment reliability signals
  totalCampaigns: number;
  completedOnTime: number;
  disputes: number;
  // Engagement authenticity signals
  followersCount: number;
  avgEngagementRate: number;
  followerGrowthRate: number; // % per month
  commentQuality: number; // 0-1 ratio of real vs. bot-like comments
  // Audience quality signals
  audienceRealPercent: number; // 0-100 estimated real audience
  demographicMatchScore: number; // 0-100 how well audience matches creator's niche
  // Growth health signals
  monthlyGrowthRates: number[]; // last 6 months of growth rates
}

function calculateComponents(metrics: CreditScoreInput): CreditScoreComponents {
  // Payment reliability: based on on-time completion rate
  const paymentReliability = metrics.totalCampaigns > 0
    ? Math.min(100, (metrics.completedOnTime / metrics.totalCampaigns) * 100 - (metrics.disputes * 15))
    : 50; // Default for new creators with no history

  // Campaign reliability: completion rate with bonus for scale
  const completionRate = metrics.totalCampaigns > 0
    ? (metrics.completedOnTime / metrics.totalCampaigns) * 100
    : 50;
  const scaleFactor = Math.min(1, metrics.totalCampaigns / 10); // Bonus up to 10 campaigns
  const campaignReliability = Math.min(100, completionRate * (0.7 + 0.3 * scaleFactor));

  // Engagement authenticity: compare engagement rate to expected for follower count
  const expectedEngagement = getExpectedEngagement(metrics.followersCount);
  const engagementRatio = expectedEngagement > 0
    ? metrics.avgEngagementRate / expectedEngagement
    : 1;
  // Too low = dead followers, too high = manipulation
  const engagementScore = engagementRatio >= 0.5 && engagementRatio <= 2.5
    ? 80 + (metrics.commentQuality * 20)
    : engagementRatio < 0.5
    ? Math.max(20, engagementRatio * 160)
    : Math.max(20, 100 - (engagementRatio - 2.5) * 40);
  const engagementAuthenticity = Math.min(100, Math.max(0, engagementScore));

  // Audience quality
  const audienceQuality = Math.min(100,
    metrics.audienceRealPercent * 0.6 + metrics.demographicMatchScore * 0.4
  );

  // Growth health: sustainable growth is 2-10% monthly; too fast = suspicious
  const avgGrowth = metrics.monthlyGrowthRates.length > 0
    ? metrics.monthlyGrowthRates.reduce((a, b) => a + b, 0) / metrics.monthlyGrowthRates.length
    : 0;
  const growthVariance = metrics.monthlyGrowthRates.length > 1
    ? calculateVariance(metrics.monthlyGrowthRates)
    : 0;
  const growthHealth = avgGrowth >= 1 && avgGrowth <= 15
    ? Math.min(100, 80 - growthVariance * 2 + Math.min(avgGrowth, 10) * 2)
    : avgGrowth > 15
    ? Math.max(20, 60 - (avgGrowth - 15) * 3) // Suspicious rapid growth
    : Math.max(30, 50 + avgGrowth * 10); // Very slow / declining

  return {
    paymentReliability: Math.round(Math.max(0, Math.min(100, paymentReliability))),
    campaignReliability: Math.round(Math.max(0, Math.min(100, campaignReliability))),
    engagementAuthenticity: Math.round(engagementAuthenticity),
    audienceQuality: Math.round(Math.max(0, Math.min(100, audienceQuality))),
    growthHealth: Math.round(Math.max(0, Math.min(100, growthHealth))),
  };
}

/**
 * Detects potential fraud signals from creator metrics.
 */
export function detectFraudSignals(metrics: CreditScoreInput): FraudSignal[] {
  const signals: FraudSignal[] = [];
  const now = new Date().toISOString();

  // Check for sudden follower spike (>50% growth in a month)
  if (metrics.monthlyGrowthRates.some(rate => rate > 50)) {
    signals.push({
      type: 'follower_spike',
      severity: 'high',
      description: 'Detected sudden follower growth exceeding 50% in a single month',
      detectedAt: now,
      metadata: { maxGrowthRate: Math.max(...metrics.monthlyGrowthRates) },
    });
  }

  // Check for engagement drop (high followers, very low engagement)
  const expectedEng = getExpectedEngagement(metrics.followersCount);
  if (metrics.avgEngagementRate < expectedEng * 0.3 && metrics.followersCount > 10000) {
    signals.push({
      type: 'engagement_drop',
      severity: 'medium',
      description: 'Engagement rate significantly below expected for follower count',
      detectedAt: now,
      metadata: { expected: expectedEng, actual: metrics.avgEngagementRate },
    });
  }

  // Check for bot comments
  if (metrics.commentQuality < 0.4) {
    signals.push({
      type: 'bot_comments',
      severity: metrics.commentQuality < 0.2 ? 'high' : 'medium',
      description: 'High proportion of low-quality or bot-like comments detected',
      detectedAt: now,
      metadata: { commentQualityScore: metrics.commentQuality },
    });
  }

  // Check for low audience reality
  if (metrics.audienceRealPercent < 50) {
    signals.push({
      type: 'audience_anomaly',
      severity: metrics.audienceRealPercent < 30 ? 'critical' : 'high',
      description: 'Significant portion of audience appears inauthentic',
      detectedAt: now,
      metadata: { audienceRealPercent: metrics.audienceRealPercent },
    });
  }

  // Payment disputes
  if (metrics.disputes > 0) {
    signals.push({
      type: 'payment_dispute',
      severity: metrics.disputes >= 3 ? 'high' : 'low',
      description: `Creator has ${metrics.disputes} payment dispute(s) on record`,
      detectedAt: now,
      metadata: { disputes: metrics.disputes },
    });
  }

  return signals;
}

/**
 * Returns expected engagement rate based on follower count.
 * Larger accounts naturally have lower engagement rates.
 */
function getExpectedEngagement(followers: number): number {
  if (followers < 1000) return 0.08;
  if (followers < 10000) return 0.06;
  if (followers < 100000) return 0.035;
  if (followers < 1000000) return 0.018;
  return 0.01;
}

function calculateVariance(numbers: number[]): number {
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  return numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
}
