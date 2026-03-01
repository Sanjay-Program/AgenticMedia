import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '@agenticmedia/database';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';
import { createVideoJob, updateVideoJobStatus, buildCaptionOverlayCommand, buildFormatAdaptCommand } from '../services/video-engine';
import { getVideoQueue } from '../queues';
import type { TargetPlatform } from '@agenticmedia/shared-types';

export const videoRouter = Router();
videoRouter.use(authenticate);

const createJobSchema = z.object({
  jobType: z.enum(['transcribe', 'caption_render', 'clip_extract', 'format_adapt']),
  sourceFileKey: z.string().min(1),
  targetPlatforms: z.array(z.enum(['tiktok', 'youtube_shorts', 'instagram_reels', 'linkedin', 'youtube'])).optional(),
});

// Create a video processing job
videoRouter.post(
  '/jobs',
  validate(createJobSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobId } = await createVideoJob({
        organizationId: req.user!.organizationId,
        userId: req.user!.userId,
        jobType: req.body.jobType,
        sourceFileKey: req.body.sourceFileKey,
        targetPlatforms: req.body.targetPlatforms,
      });

      // Queue the job for the video worker
      const queue = getVideoQueue();
      await queue.add(`video-${req.body.jobType}`, {
        jobId,
        organizationId: req.user!.organizationId,
        jobType: req.body.jobType,
        sourceFileKey: req.body.sourceFileKey,
        targetPlatforms: req.body.targetPlatforms || [],
      });

      res.status(201).json({ jobId, status: 'queued' });
    } catch (err) {
      next(err);
    }
  }
);

// List video jobs for the organization
videoRouter.get('/jobs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, jobType, page = '1', limit = '20' } = req.query;
    const conditions: string[] = ['organization_id = $1'];
    const params: unknown[] = [req.user!.organizationId];
    let idx = 2;

    if (status) { conditions.push(`status = $${idx++}`); params.push(status); }
    if (jobType) { conditions.push(`job_type = $${idx++}`); params.push(jobType); }

    const offset = (Number(page) - 1) * Number(limit);
    params.push(Number(limit), offset);

    const result = await query(
      `SELECT * FROM video_jobs WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM video_jobs WHERE ${conditions.join(' AND ')}`,
      params.slice(0, conditions.length)
    );

    res.json({
      jobs: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    next(err);
  }
});

// Get a single video job
videoRouter.get('/jobs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT * FROM video_jobs WHERE id = $1 AND organization_id = $2`,
      [req.params.id, req.user!.organizationId]
    );

    if (result.rows.length === 0) {
      throw new AppError(404, 'Video job not found');
    }

    res.json({ job: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// Get content assets for a video job (multi-platform adaptations)
videoRouter.get('/jobs/:id/assets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT ca.* FROM content_assets ca
       JOIN video_jobs vj ON vj.id = ca.video_job_id
       WHERE ca.video_job_id = $1 AND vj.organization_id = $2
       ORDER BY ca.platform`,
      [req.params.id, req.user!.organizationId]
    );

    res.json({ assets: result.rows });
  } catch (err) {
    next(err);
  }
});

// Generate a presigned upload URL (simulated — in production uses AWS S3/R2)
videoRouter.post('/upload-url', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileName, contentType } = req.body;
    if (!fileName || !contentType) {
      throw new AppError(400, 'fileName and contentType are required');
    }

    // In production, this would generate a presigned S3/R2 URL
    const fileKey = `uploads/${req.user!.organizationId}/${Date.now()}-${fileName}`;
    const uploadUrl = `https://storage.agenticmedia.com/${fileKey}?presigned=true`;

    res.json({
      fileKey,
      uploadUrl,
      expiresIn: 3600,
    });
  } catch (err) {
    next(err);
  }
});
