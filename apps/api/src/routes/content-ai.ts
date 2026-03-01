/**
 * Content AI Routes
 *
 * /api/content-ai — Viral hooks, thumbnail testing, script generation
 */
import { Router, Request, Response, NextFunction } from 'express';
import { query } from '@agenticmedia/database';
import { AppError } from '../middleware/error-handler';
import { generateViralHooks, scoreThumbnailVariant, selectBestThumbnail, generateScriptOutline } from '../services/agents/content-ai';
import type { ScriptFormat } from '@agenticmedia/shared-types';

const contentAIRouter = Router();

// ──────────────────────────────────────────────────────────────
// Viral Hook Generator
// ──────────────────────────────────────────────────────────────

/**
 * POST /api/content-ai/hooks
 * Generate viral hook suggestions.
 */
contentAIRouter.post(
  '/hooks',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { originalHook, topic } = req.body;
      if (!originalHook || !topic) throw new AppError(400, 'originalHook and topic are required');

      const suggestions = generateViralHooks(originalHook, topic);
      res.json({ suggestions });
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────
// Thumbnail Intelligence
// ──────────────────────────────────────────────────────────────

/**
 * POST /api/content-ai/thumbnails/score
 * Score a set of thumbnail variants and pick the best.
 */
contentAIRouter.post(
  '/thumbnails/score',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { variants } = req.body;
      if (!Array.isArray(variants) || variants.length === 0) {
        throw new AppError(400, 'variants array is required');
      }

      const scored = variants.map((v: any, i: number) =>
        scoreThumbnailVariant(
          v.id || `thumb_${i}`,
          v.imageUrl || '',
          !!v.hasText,
          !!v.hasFace,
          v.dominantColors || []
        )
      );

      const winner = selectBestThumbnail(scored);

      res.json({
        variants: scored,
        winnerId: winner?.id || null,
        bestPredictedCTR: winner?.predictedCTR || 0,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ──────────────────────────────────────────────────────────────
// Script Generation
// ──────────────────────────────────────────────────────────────

/**
 * POST /api/content-ai/scripts
 * Generate a content script.
 */
contentAIRouter.post(
  '/scripts',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { creatorId, format, topic, tone = 'professional' } = req.body;

      if (!creatorId || !format || !topic) {
        throw new AppError(400, 'creatorId, format, and topic are required');
      }

      const validFormats: ScriptFormat[] = ['youtube_short', 'youtube_long', 'tiktok', 'linkedin', 'podcast', 'newsletter'];
      if (!validFormats.includes(format)) {
        throw new AppError(400, `format must be one of: ${validFormats.join(', ')}`);
      }

      const script = generateScriptOutline(creatorId, format, topic, tone);

      // Track AI job
      await query(
        `INSERT INTO content_ai_jobs
         (id, organization_id, creator_id, type, status, input, output, tokens_used, cost_estimate, created_at)
         VALUES (gen_random_uuid(), $1, $2, 'script_write', 'completed', $3, $4, $5, $6, NOW())
         ON CONFLICT DO NOTHING`,
        [
          req.user!.organizationId, creatorId,
          JSON.stringify({ format, topic, tone }),
          JSON.stringify(script),
          150, 0.003,
        ]
      );

      res.json(script);
    } catch (err) {
      next(err);
    }
  }
);

export { contentAIRouter };
