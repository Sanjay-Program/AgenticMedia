import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '@agenticmedia/database';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { calculateVelocityScore, processScoutPayload } from '../services/agents/scout';
import { getScoutQueue } from '../queues';
import type { ScoutWorkerPayload } from '@agenticmedia/shared-types';

export const scoutRouter = Router();
scoutRouter.use(authenticate);

// Get trending creators with velocity scores (real-time scouting dashboard)
scoutRouter.get('/trending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT c.id, c.full_name, c.avatar_url, c.primary_platform,
              cp.id as creator_platform_id, cp.platform, cp.username, cp.followers_count,
              dm.ai_score, dm.growth_velocity, dm.engagement_rate, dm.avg_views,
              dm.followers_count as snapshot_followers, dm.snapshot_date
       FROM creators c
       JOIN creator_platforms cp ON cp.creator_id = c.id
       LEFT JOIN LATERAL (
         SELECT * FROM discovery_metrics
         WHERE creator_platform_id = cp.id
         ORDER BY snapshot_date DESC
         LIMIT 1
       ) dm ON true
       WHERE c.organization_id = $1
       ORDER BY dm.growth_velocity DESC NULLS LAST, dm.ai_score DESC NULLS LAST
       LIMIT 50`,
      [req.user!.organizationId]
    );

    res.json({ trending: result.rows });
  } catch (err) {
    next(err);
  }
});

// Get breakout alerts for the organization
scoutRouter.get('/alerts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT el.id, el.payload, el.created_at
       FROM event_log el
       WHERE el.organization_id = $1
         AND el.event_type = 'social.creator.discovered'
         AND el.source = 'scout-engine'
       ORDER BY el.created_at DESC
       LIMIT 50`,
      [req.user!.organizationId]
    );

    res.json({ alerts: result.rows });
  } catch (err) {
    next(err);
  }
});

const ingestMetricsSchema = z.object({
  creatorPlatformId: z.string().uuid(),
  platform: z.string(),
  recentVideos: z.array(z.object({
    videoId: z.string(),
    views: z.number().int().min(0),
    likes: z.number().int().min(0),
    comments: z.number().int().min(0),
    shares: z.number().int().min(0),
    publishedAt: z.string(),
  })).min(1),
  historicalAvgViews: z.number().min(0),
  historicalAvgEngagement: z.number().min(0),
  followersCount: z.number().int().min(0),
});

// Ingest social metrics and calculate velocity score (called by scraper workers)
scoutRouter.post(
  '/ingest',
  validate(ingestMetricsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload: ScoutWorkerPayload = {
        organizationId: req.user!.organizationId,
        creatorPlatformId: req.body.creatorPlatformId,
        platform: req.body.platform,
        metrics: {
          recentVideos: req.body.recentVideos,
          historicalAvgViews: req.body.historicalAvgViews,
          historicalAvgEngagement: req.body.historicalAvgEngagement,
          followersCount: req.body.followersCount,
        },
      };

      const score = await processScoutPayload(payload);
      res.json({ velocityScore: score });
    } catch (err) {
      next(err);
    }
  }
);

// Queue a batch of creators for background scouting
scoutRouter.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { creatorPlatformIds } = req.body;
    if (!Array.isArray(creatorPlatformIds) || creatorPlatformIds.length === 0) {
      res.status(400).json({ error: 'creatorPlatformIds array required' });
      return;
    }

    const queue = getScoutQueue();
    const jobs = creatorPlatformIds.map((id: string) =>
      queue.add('scout-creator', {
        organizationId: req.user!.organizationId,
        creatorPlatformId: id,
      })
    );

    await Promise.all(jobs);
    res.json({ queued: creatorPlatformIds.length });
  } catch (err) {
    next(err);
  }
});

// Calculate velocity score for a single creator (synchronous, for UI preview)
scoutRouter.get(
  '/velocity/:creatorPlatformId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Fetch creator metrics from DB
      const metricsResult = await query(
        `SELECT dm.avg_views, dm.engagement_rate, dm.followers_count, dm.growth_velocity, dm.ai_score, dm.snapshot_date
         FROM discovery_metrics dm
         JOIN creator_platforms cp ON cp.id = dm.creator_platform_id
         JOIN creators c ON c.id = cp.creator_id
         WHERE dm.creator_platform_id = $1 AND c.organization_id = $2
         ORDER BY dm.snapshot_date DESC
         LIMIT 10`,
        [req.params.creatorPlatformId, req.user!.organizationId]
      );

      if (metricsResult.rows.length === 0) {
        res.json({ velocityScore: null, message: 'No metrics available for this creator' });
        return;
      }

      const latest = metricsResult.rows[0];
      res.json({
        velocityScore: {
          aiScore: latest.ai_score,
          growthVelocity: latest.growth_velocity,
          engagementRate: latest.engagement_rate,
          avgViews: latest.avg_views,
          followersCount: latest.followers_count,
          snapshotDate: latest.snapshot_date,
        },
        history: metricsResult.rows,
      });
    } catch (err) {
      next(err);
    }
  }
);
