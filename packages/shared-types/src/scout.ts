// Module 1: Predictive Scouting Engine Types

export interface VelocityScore {
  creatorPlatformId: string;
  platform: string;
  baselineAvgViews: number;
  recentAvgViews: number;
  velocityMultiplier: number;
  engagementSpike: number;
  overallScore: number;
  isBreakout: boolean;
  calculatedAt: string;
}

export interface ScoutAlert {
  id: string;
  organizationId: string;
  creatorPlatformId: string;
  creatorName: string;
  platform: string;
  velocityScore: VelocityScore;
  alertType: ScoutAlertType;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export type ScoutAlertType = 'breakout_detected' | 'engagement_spike' | 'viral_content' | 'growth_acceleration';

export interface ScoutWorkerPayload {
  organizationId: string;
  creatorPlatformId: string;
  platform: string;
  metrics: {
    recentVideos: VideoMetric[];
    historicalAvgViews: number;
    historicalAvgEngagement: number;
    followersCount: number;
  };
}

export interface VideoMetric {
  videoId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  publishedAt: string;
}

/**
 * Thresholds for breakout detection.
 * A creator is flagged as "breakout" when their recent metrics
 * exceed their baseline by these multipliers.
 */
export const SCOUT_THRESHOLDS = {
  /** Views multiplier to qualify as breakout (e.g., 10x normal) */
  VIEWS_MULTIPLIER: 10,
  /** Engagement spike threshold (e.g., 5x normal) */
  ENGAGEMENT_MULTIPLIER: 5,
  /** Minimum recent videos needed for velocity calculation */
  MIN_RECENT_VIDEOS: 3,
  /** Maximum recent videos to analyze */
  MAX_RECENT_VIDEOS: 5,
  /** Minimum followers to consider (filters noise) */
  MIN_FOLLOWERS: 1000,
} as const;
