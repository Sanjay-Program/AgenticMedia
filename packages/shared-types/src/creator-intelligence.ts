// Creator Intelligence Superlayer — Data Moat Engine types

/** Creator Risk Intelligence Engine */
export type RiskCategory =
  | 'political_exposure'
  | 'reputation_volatility'
  | 'cancel_probability'
  | 'copyright_strikes'
  | 'audience_toxicity'
  | 'brand_safety';

export interface CreatorRiskSignal {
  category: RiskCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-100
  description: string;
  detectedAt: string;
  source: string;
}

export interface CreatorRiskAssessment {
  creatorId: string;
  organizationId: string;
  overallRiskScore: number; // 0-100 (0 = safe, 100 = extreme risk)
  riskLevel: 'minimal' | 'low' | 'moderate' | 'high' | 'critical';
  signals: CreatorRiskSignal[];
  cancelProbability: number; // 0-1
  reputationVolatility: number; // 0-1
  audienceToxicityScore: number; // 0-100
  assessedAt: string;
}

/** Audience Quality Analyzer */
export interface AudienceQualityReport {
  creatorId: string;
  platform: string;
  botPercentage: number; // 0-100
  engagementAuthenticity: number; // 0-100
  geographicFraudScore: number; // 0-100
  suspiciousCommentClusters: number;
  inorganicSpikeCount: number;
  overallQualityScore: number; // 0-100
  analyzedAt: string;
}

/** Creator Lifetime Value Model */
export interface CreatorLTVPrediction {
  creatorId: string;
  organizationId: string;
  sixMonthRevenue: number;
  twelveMonthRevenue: number;
  viralProbability: number; // 0-1
  plateauRiskScore: number; // 0-100
  burnoutRiskScore: number; // 0-100
  growthTrajectory: 'declining' | 'stagnant' | 'growing' | 'accelerating' | 'explosive';
  confidenceScore: number; // 0-1
  predictedAt: string;
}

/** Risk level classification */
export function classifyRiskLevel(score: number): CreatorRiskAssessment['riskLevel'] {
  if (score <= 15) return 'minimal';
  if (score <= 35) return 'low';
  if (score <= 55) return 'moderate';
  if (score <= 75) return 'high';
  return 'critical';
}

/** Growth trajectory classification based on monthly growth rate */
export function classifyGrowthTrajectory(monthlyGrowthRate: number): CreatorLTVPrediction['growthTrajectory'] {
  if (monthlyGrowthRate < -0.02) return 'declining';
  if (monthlyGrowthRate < 0.02) return 'stagnant';
  if (monthlyGrowthRate < 0.10) return 'growing';
  if (monthlyGrowthRate < 0.25) return 'accelerating';
  return 'explosive';
}
