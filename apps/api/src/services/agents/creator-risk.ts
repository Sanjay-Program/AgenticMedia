/**
 * Creator Risk Intelligence Engine
 *
 * Evaluates creator risk across multiple dimensions:
 * - Political exposure
 * - Reputation volatility
 * - Cancel probability
 * - Copyright strike patterns
 * - Audience toxicity
 */

import type { CreatorRiskSignal, CreatorRiskAssessment, RiskCategory } from '@agenticmedia/shared-types';
import { classifyRiskLevel } from '@agenticmedia/shared-types';

/** Input metrics for risk assessment */
export interface RiskAssessmentInput {
  creatorId: string;
  organizationId: string;
  controversyMentions: number;      // news/social mentions of controversy
  politicalContentRatio: number;    // 0-1 ratio of political posts
  sentimentVolatility: number;      // standard deviation of sentiment scores
  copyrightStrikes: number;
  communityStrikes: number;
  negativeCommentRatio: number;     // 0-1
  audienceToxicitySignals: number;  // flagged audience interactions
  followerCount: number;
  recentUnfollowSpike: boolean;
}

/** Compute an overall risk assessment from raw signals */
export function assessCreatorRisk(input: RiskAssessmentInput): CreatorRiskAssessment {
  const signals: CreatorRiskSignal[] = [];
  const now = new Date().toISOString();

  // Political exposure (0-100)
  const politicalScore = Math.min(input.politicalContentRatio * 100 + input.controversyMentions * 5, 100);
  if (politicalScore > 20) {
    signals.push({
      category: 'political_exposure',
      severity: politicalScore > 70 ? 'critical' : politicalScore > 45 ? 'high' : 'medium',
      score: Math.round(politicalScore),
      description: `Political content ratio ${(input.politicalContentRatio * 100).toFixed(0)}%, ${input.controversyMentions} controversy mentions`,
      detectedAt: now,
      source: 'content_analysis',
    });
  }

  // Reputation volatility
  const volatilityScore = Math.min(input.sentimentVolatility * 100, 100);
  if (volatilityScore > 30) {
    signals.push({
      category: 'reputation_volatility',
      severity: volatilityScore > 70 ? 'high' : 'medium',
      score: Math.round(volatilityScore),
      description: `Sentiment volatility score: ${volatilityScore.toFixed(0)}`,
      detectedAt: now,
      source: 'sentiment_engine',
    });
  }

  // Copyright strikes
  const copyrightScore = Math.min(input.copyrightStrikes * 25 + input.communityStrikes * 20, 100);
  if (copyrightScore > 0) {
    signals.push({
      category: 'copyright_strikes',
      severity: copyrightScore > 60 ? 'critical' : copyrightScore > 30 ? 'high' : 'medium',
      score: copyrightScore,
      description: `${input.copyrightStrikes} copyright, ${input.communityStrikes} community strikes`,
      detectedAt: now,
      source: 'platform_data',
    });
  }

  // Audience toxicity
  const toxicityScore = Math.min(input.negativeCommentRatio * 80 + input.audienceToxicitySignals * 3, 100);
  if (toxicityScore > 15) {
    signals.push({
      category: 'audience_toxicity',
      severity: toxicityScore > 60 ? 'high' : 'medium',
      score: Math.round(toxicityScore),
      description: `${(input.negativeCommentRatio * 100).toFixed(0)}% negative comments, ${input.audienceToxicitySignals} toxic signals`,
      detectedAt: now,
      source: 'audience_analysis',
    });
  }

  // Cancel probability weighted formula
  const cancelProbability = Math.min(
    (politicalScore * 0.25 + volatilityScore * 0.25 + copyrightScore * 0.20 + toxicityScore * 0.15 +
      (input.recentUnfollowSpike ? 15 : 0)) / 100,
    1
  );

  // Overall risk score (weighted average)
  const overallRiskScore = Math.round(
    politicalScore * 0.20 +
    volatilityScore * 0.20 +
    copyrightScore * 0.25 +
    toxicityScore * 0.20 +
    cancelProbability * 15
  );

  const clampedScore = Math.min(overallRiskScore, 100);

  return {
    creatorId: input.creatorId,
    organizationId: input.organizationId,
    overallRiskScore: clampedScore,
    riskLevel: classifyRiskLevel(clampedScore),
    signals,
    cancelProbability: Math.round(cancelProbability * 1000) / 1000,
    reputationVolatility: Math.round(volatilityScore) / 100,
    audienceToxicityScore: Math.round(toxicityScore),
    assessedAt: now,
  };
}
