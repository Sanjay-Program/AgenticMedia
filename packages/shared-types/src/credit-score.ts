// Enterprise V2: Creator Credit Score & Fraud Detection Types

export type CreditScoreGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type FraudSignalSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface CreatorCreditScore {
  creatorId: string;
  organizationId: string;
  overallScore: number; // 0-100
  grade: CreditScoreGrade;
  components: CreditScoreComponents;
  fraudSignals: FraudSignal[];
  calculatedAt: string;
}

export interface CreditScoreComponents {
  /** Payment reliability (on-time delivery, no disputes) — 0-100 */
  paymentReliability: number;
  /** Campaign performance vs. expectations — 0-100 */
  campaignReliability: number;
  /** Engagement authenticity (real vs. bot followers) — 0-100 */
  engagementAuthenticity: number;
  /** Audience quality (demographics match, real accounts) — 0-100 */
  audienceQuality: number;
  /** Growth trajectory (sustainable organic growth) — 0-100 */
  growthHealth: number;
}

export interface FraudSignal {
  type: FraudSignalType;
  severity: FraudSignalSeverity;
  description: string;
  detectedAt: string;
  metadata: Record<string, unknown>;
}

export type FraudSignalType =
  | 'follower_spike'        // Sudden unnatural follower increase
  | 'engagement_drop'       // High followers but very low engagement
  | 'bot_comments'          // Pattern of generic/bot comments
  | 'audience_anomaly'      // Audience demographics don't match content
  | 'view_manipulation'     // Views don't correlate with engagement
  | 'duplicate_content'     // Re-uploaded content from other creators
  | 'payment_dispute'       // History of payment disputes
  | 'contract_breach';      // History of breaking contract terms

export const CREDIT_SCORE_WEIGHTS = {
  PAYMENT_RELIABILITY: 0.25,
  CAMPAIGN_RELIABILITY: 0.20,
  ENGAGEMENT_AUTHENTICITY: 0.25,
  AUDIENCE_QUALITY: 0.15,
  GROWTH_HEALTH: 0.15,
} as const;

export function gradeFromScore(score: number): CreditScoreGrade {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}
