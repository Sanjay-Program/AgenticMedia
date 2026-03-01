import { v4 as uuidv4 } from 'uuid';
import { query } from '@agenticmedia/database';
import { publishEvent } from '../event-bus';
import { emitToOrganization } from '../websocket';
import type {
  VelocityScore,
  ScoutWorkerPayload,
  VideoMetric,
  EventType,
} from '@agenticmedia/shared-types';
import { SCOUT_THRESHOLDS } from '@agenticmedia/shared-types';

/**
 * Calculates a velocity score for a creator based on their recent video performance
 * compared to their historical baseline. This is the core algorithm for
 * the Predictive Scouting Engine (Module 1).
 *
 * A high velocity score indicates the creator is experiencing a breakout moment —
 * their recent content is dramatically outperforming their historical average.
 *
 * @param recentVideos - The creator's most recent videos (last 5)
 * @param historicalAvgViews - Their baseline average views per video
 * @param historicalAvgEngagement - Their baseline average engagement rate
 * @param followersCount - Current follower count
 * @returns VelocityScore with breakout detection
 */
export function calculateVelocityScore(
  creatorPlatformId: string,
  platform: string,
  recentVideos: VideoMetric[],
  historicalAvgViews: number,
  historicalAvgEngagement: number,
  followersCount: number
): VelocityScore {
  // Need minimum recent videos to calculate meaningful velocity
  if (recentVideos.length < SCOUT_THRESHOLDS.MIN_RECENT_VIDEOS) {
    return {
      creatorPlatformId,
      platform,
      baselineAvgViews: historicalAvgViews,
      recentAvgViews: 0,
      velocityMultiplier: 0,
      engagementSpike: 0,
      overallScore: 0,
      isBreakout: false,
      calculatedAt: new Date().toISOString(),
    };
  }

  // Take only the most recent N videos
  const videos = recentVideos
    .slice(0, SCOUT_THRESHOLDS.MAX_RECENT_VIDEOS);

  // Calculate recent averages
  const recentAvgViews = videos.reduce((sum, v) => sum + v.views, 0) / videos.length;
  const recentAvgEngagement = videos.reduce((sum, v) => {
    const totalEngagement = v.likes + v.comments + v.shares;
    return sum + (v.views > 0 ? totalEngagement / v.views : 0);
  }, 0) / videos.length;

  // Calculate velocity multiplier (how much recent outperforms baseline)
  const velocityMultiplier = historicalAvgViews > 0
    ? recentAvgViews / historicalAvgViews
    : recentAvgViews > 0 ? SCOUT_THRESHOLDS.VIEWS_MULTIPLIER : 0;

  // Calculate engagement spike
  const engagementSpike = historicalAvgEngagement > 0
    ? recentAvgEngagement / historicalAvgEngagement
    : recentAvgEngagement > 0 ? SCOUT_THRESHOLDS.ENGAGEMENT_MULTIPLIER : 0;

  // Check for individual viral videos (any single video with 10x+ views)
  const viralVideoCount = videos.filter(
    v => historicalAvgViews > 0 && v.views >= historicalAvgViews * SCOUT_THRESHOLDS.VIEWS_MULTIPLIER
  ).length;

  // Overall score: weighted combination (0-100)
  const velocityComponent = Math.min(velocityMultiplier / SCOUT_THRESHOLDS.VIEWS_MULTIPLIER, 1) * 40;
  const engagementComponent = Math.min(engagementSpike / SCOUT_THRESHOLDS.ENGAGEMENT_MULTIPLIER, 1) * 30;
  const viralComponent = Math.min(viralVideoCount / SCOUT_THRESHOLDS.MIN_RECENT_VIDEOS, 1) * 30;
  const overallScore = Math.round((velocityComponent + engagementComponent + viralComponent) * 100) / 100;

  // Breakout detection
  const isBreakout =
    followersCount >= SCOUT_THRESHOLDS.MIN_FOLLOWERS &&
    (velocityMultiplier >= SCOUT_THRESHOLDS.VIEWS_MULTIPLIER ||
     engagementSpike >= SCOUT_THRESHOLDS.ENGAGEMENT_MULTIPLIER ||
     viralVideoCount >= SCOUT_THRESHOLDS.MIN_RECENT_VIDEOS);

  return {
    creatorPlatformId,
    platform,
    baselineAvgViews: historicalAvgViews,
    recentAvgViews: Math.round(recentAvgViews),
    velocityMultiplier: Math.round(velocityMultiplier * 100) / 100,
    engagementSpike: Math.round(engagementSpike * 100) / 100,
    overallScore,
    isBreakout,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Processes a scout worker payload: calculates velocity, stores metrics,
 * and fires alerts when breakouts are detected.
 */
export async function processScoutPayload(
  payload: ScoutWorkerPayload
): Promise<VelocityScore> {
  const { organizationId, creatorPlatformId, platform, metrics } = payload;

  const score = calculateVelocityScore(
    creatorPlatformId,
    platform,
    metrics.recentVideos,
    metrics.historicalAvgViews,
    metrics.historicalAvgEngagement,
    metrics.followersCount
  );

  // Update the discovery_metrics table with the latest velocity data
  try {
    await query(
      `INSERT INTO discovery_metrics (id, creator_platform_id, snapshot_date, followers_count, avg_views, engagement_rate, growth_velocity, ai_score)
       VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7)
       ON CONFLICT (creator_platform_id, snapshot_date)
       DO UPDATE SET avg_views = $4, engagement_rate = $5, growth_velocity = $6, ai_score = $7`,
      [
        uuidv4(),
        creatorPlatformId,
        metrics.followersCount,
        score.recentAvgViews,
        score.engagementSpike,
        score.velocityMultiplier,
        score.overallScore,
      ]
    );
  } catch (err) {
    console.error('Failed to update discovery metrics:', err);
  }

  // If breakout detected, publish alert event and broadcast via WebSocket
  if (score.isBreakout) {
    try {
      await publishEvent({
        organizationId,
        eventType: 'social.creator.discovered' as EventType,
        source: 'scout-engine',
        payload: {
          creatorPlatformId,
          platform,
          velocityScore: score,
          alertType: 'breakout_detected',
        },
        idempotencyKey: `scout-breakout-${creatorPlatformId}-${new Date().toISOString().slice(0, 10)}`,
      });

      emitToOrganization(organizationId, 'scout:breakout', {
        creatorPlatformId,
        platform,
        velocityScore: score,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to publish scout alert:', err);
    }
  }

  return score;
}
