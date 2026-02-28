import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { query } from '@agenticmedia/database';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';

export const creatorsRouter = Router();
creatorsRouter.use(authenticate);

const createCreatorSchema = z.object({
  fullName: z.string().min(1).max(255),
  email: z.string().email(),
  bio: z.string().max(2000).optional(),
  primaryPlatform: z.enum(['youtube', 'instagram', 'tiktok', 'linkedin', 'twitter']),
});

const addPlatformSchema = z.object({
  platform: z.enum(['youtube', 'instagram', 'tiktok', 'linkedin', 'twitter']),
  platformUserId: z.string().min(1),
  username: z.string().min(1),
  followersCount: z.number().int().min(0).default(0),
  engagementRate: z.number().min(0).max(100).default(0),
  avgViews: z.number().int().min(0).default(0),
});

// List creators for the organization
creatorsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    const result = await query(
      `SELECT c.*, 
              COALESCE(json_agg(cp.*) FILTER (WHERE cp.id IS NOT NULL), '[]') as platforms
       FROM creators c
       LEFT JOIN creator_platforms cp ON cp.creator_id = c.id
       WHERE c.organization_id = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user!.organizationId, Number(limit), offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM creators WHERE organization_id = $1',
      [req.user!.organizationId]
    );

    res.json({
      creators: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    next(err);
  }
});

// Create a new creator
creatorsRouter.post(
  '/',
  authorize('admin', 'talent_manager'),
  validate(createCreatorSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fullName, email, bio, primaryPlatform } = req.body;
      const id = uuidv4();

      await query(
        `INSERT INTO creators (id, organization_id, full_name, email, bio, primary_platform)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, req.user!.organizationId, fullName, email, bio || null, primaryPlatform]
      );

      const result = await query('SELECT * FROM creators WHERE id = $1', [id]);
      res.status(201).json({ creator: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// Get single creator with platforms
creatorsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT c.*, 
              COALESCE(json_agg(cp.*) FILTER (WHERE cp.id IS NOT NULL), '[]') as platforms
       FROM creators c
       LEFT JOIN creator_platforms cp ON cp.creator_id = c.id
       WHERE c.id = $1 AND c.organization_id = $2
       GROUP BY c.id`,
      [req.params.id, req.user!.organizationId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'Creator not found');
    }

    res.json({ creator: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// Add platform to creator
creatorsRouter.post(
  '/:id/platforms',
  authorize('admin', 'talent_manager'),
  validate(addPlatformSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { platform, platformUserId, username, followersCount, engagementRate, avgViews } = req.body;
      const platformId = uuidv4();

      // Verify creator belongs to org
      const creator = await query(
        'SELECT id FROM creators WHERE id = $1 AND organization_id = $2',
        [req.params.id, req.user!.organizationId]
      );
      if (creator.rows.length === 0) {
        throw new AppError(404, 'Creator not found');
      }

      await query(
        `INSERT INTO creator_platforms (id, creator_id, platform, platform_user_id, username, followers_count, engagement_rate, avg_views)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [platformId, req.params.id, platform, platformUserId, username, followersCount, engagementRate, avgViews]
      );

      const result = await query('SELECT * FROM creator_platforms WHERE id = $1', [platformId]);
      res.status(201).json({ platform: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);
