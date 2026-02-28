import { Router, Request, Response, NextFunction } from 'express';
import { query } from '@agenticmedia/database';
import { authenticate } from '../middleware/authenticate';
import { AppError } from '../middleware/error-handler';

export const discoveryRouter = Router();
discoveryRouter.use(authenticate);

// Advanced creator search with filtering
discoveryRouter.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      platform,
      minFollowers,
      maxFollowers,
      minEngagementRate,
      minAiScore,
      country,
      sortBy = 'ai_score',
      sortOrder = 'desc',
      page = '1',
      limit = '20',
    } = req.query;

    const conditions: string[] = ['c.organization_id = $1'];
    const params: unknown[] = [req.user!.organizationId];
    let paramIndex = 2;

    if (platform) {
      conditions.push(`cp.platform = $${paramIndex++}`);
      params.push(platform);
    }
    if (minFollowers) {
      conditions.push(`dm.followers_count >= $${paramIndex++}`);
      params.push(Number(minFollowers));
    }
    if (maxFollowers) {
      conditions.push(`dm.followers_count <= $${paramIndex++}`);
      params.push(Number(maxFollowers));
    }
    if (minEngagementRate) {
      conditions.push(`dm.engagement_rate >= $${paramIndex++}`);
      params.push(Number(minEngagementRate));
    }
    if (minAiScore) {
      conditions.push(`dm.ai_score >= $${paramIndex++}`);
      params.push(Number(minAiScore));
    }
    if (country) {
      conditions.push(`dm.demographics->>'topCountries' ILIKE '%' || $${paramIndex++} || '%'`);
      params.push(country);
    }

    const allowedSorts: Record<string, string> = {
      ai_score: 'dm.ai_score',
      growth_velocity: 'dm.growth_velocity',
      engagement_rate: 'dm.engagement_rate',
      followers_count: 'dm.followers_count',
    };
    const sortColumn = allowedSorts[sortBy as string] || 'dm.ai_score';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const offset = (Number(page) - 1) * Number(limit);
    params.push(Number(limit), offset);

    const result = await query(
      `SELECT c.id, c.full_name, c.email, c.avatar_url, c.primary_platform,
              cp.platform, cp.username, cp.followers_count as current_followers,
              dm.ai_score, dm.engagement_rate, dm.growth_velocity, dm.predicted_roi,
              dm.demographics, dm.brand_affinity, dm.snapshot_date
       FROM creators c
       JOIN creator_platforms cp ON cp.creator_id = c.id
       LEFT JOIN LATERAL (
         SELECT * FROM discovery_metrics 
         WHERE creator_platform_id = cp.id 
         ORDER BY snapshot_date DESC 
         LIMIT 1
       ) dm ON true
       WHERE ${conditions.join(' AND ')}
       ORDER BY ${sortColumn} ${order} NULLS LAST
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    res.json({
      results: result.rows,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    next(err);
  }
});

// Get discovery metrics history for a creator platform
discoveryRouter.get(
  '/metrics/:creatorPlatformId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await query(
        `SELECT dm.* FROM discovery_metrics dm
         JOIN creator_platforms cp ON cp.id = dm.creator_platform_id
         JOIN creators c ON c.id = cp.creator_id
         WHERE dm.creator_platform_id = $1 AND c.organization_id = $2
         ORDER BY dm.snapshot_date DESC
         LIMIT 90`,
        [req.params.creatorPlatformId, req.user!.organizationId]
      );

      res.json({ metrics: result.rows });
    } catch (err) {
      next(err);
    }
  }
);

// Get top trending creators
discoveryRouter.get('/trending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT c.id, c.full_name, c.avatar_url, c.primary_platform,
              cp.platform, cp.username,
              dm.ai_score, dm.growth_velocity, dm.engagement_rate, dm.followers_count
       FROM creators c
       JOIN creator_platforms cp ON cp.creator_id = c.id
       LEFT JOIN LATERAL (
         SELECT * FROM discovery_metrics 
         WHERE creator_platform_id = cp.id 
         ORDER BY snapshot_date DESC 
         LIMIT 1
       ) dm ON true
       WHERE c.organization_id = $1 AND dm.growth_velocity > 5
       ORDER BY dm.growth_velocity DESC
       LIMIT 20`,
      [req.user!.organizationId]
    );

    res.json({ trending: result.rows });
  } catch (err) {
    next(err);
  }
});
