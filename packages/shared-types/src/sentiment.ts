// Module 7: Crisis Shield & Sentiment Engine Types

export type SentimentLabel = 'positive' | 'neutral' | 'negative' | 'toxic';
export type CrisisLevel = 'normal' | 'watch' | 'warning' | 'critical';

export interface SentimentScore {
  id: string;
  organizationId: string;
  creatorPlatformId: string;
  platform: string;
  sourceType: SentimentSourceType;
  sourceId: string;
  text: string;
  sentiment: SentimentLabel;
  confidence: number;
  toxicityScore: number;
  analyzedAt: string;
}

export type SentimentSourceType = 'comment' | 'reply' | 'mention' | 'dm';

export interface CrisisAlert {
  id: string;
  organizationId: string;
  creatorPlatformId: string;
  creatorName: string;
  platform: string;
  crisisLevel: CrisisLevel;
  negativePercentage: number;
  sampleComments: string[];
  autoActions: CrisisAutoAction[];
  resolvedAt: string | null;
  createdAt: string;
}

export type CrisisAutoAction = 'pause_scheduled_content' | 'notify_admin_email' | 'notify_admin_sms' | 'escalate_to_human';

export interface SentimentWindow {
  creatorPlatformId: string;
  platform: string;
  windowMinutes: number;
  totalComments: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  toxicCount: number;
  negativePercentage: number;
  crisisLevel: CrisisLevel;
}

/**
 * Crisis Shield thresholds for sentiment spike detection.
 */
export const CRISIS_THRESHOLDS = {
  /** Percentage of negative+toxic comments to trigger WATCH */
  WATCH_THRESHOLD: 40,
  /** Percentage of negative+toxic comments to trigger WARNING */
  WARNING_THRESHOLD: 60,
  /** Percentage of negative+toxic comments to trigger CRITICAL */
  CRITICAL_THRESHOLD: 80,
  /** Sliding window duration in minutes */
  WINDOW_MINUTES: 10,
  /** Minimum comments in window to activate detection */
  MIN_COMMENTS_IN_WINDOW: 5,
} as const;

export interface AnalyzeSentimentInput {
  organizationId: string;
  creatorPlatformId: string;
  platform: string;
  comments: Array<{
    sourceType: SentimentSourceType;
    sourceId: string;
    text: string;
  }>;
}
