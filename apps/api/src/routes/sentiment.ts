import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '@agenticmedia/database';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { analyzeSentimentBatch, classifySentiment, evaluateCrisisLevel } from '../services/agents/sentiment';
import { getSentimentQueue } from '../queues';

export const sentimentRouter = Router();
sentimentRouter.use(authenticate);

const analyzeBatchSchema = z.object({
  creatorPlatformId: z.string().uuid(),
  platform: z.string(),
  comments: z.array(z.object({
    sourceType: z.enum(['comment', 'reply', 'mention', 'dm']),
    sourceId: z.string(),
    text: z.string().min(1).max(5000),
  })).min(1).max(500),
});

// Analyze a batch of comments for sentiment and crisis detection
sentimentRouter.post(
  '/analyze',
  validate(analyzeBatchSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await analyzeSentimentBatch({
        organizationId: req.user!.organizationId,
        creatorPlatformId: req.body.creatorPlatformId,
        platform: req.body.platform,
        comments: req.body.comments,
      });

      res.json({ sentimentWindow: result });
    } catch (err) {
      next(err);
    }
  }
);

// Webhook endpoint for incoming comments from social platforms
sentimentRouter.post('/webhook/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId, creatorPlatformId, platform, comments } = req.body;

    if (!organizationId || !creatorPlatformId || !platform || !Array.isArray(comments)) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Queue for background processing
    const queue = getSentimentQueue();
    await queue.add('analyze-comments', {
      organizationId,
      creatorPlatformId,
      platform,
      comments,
    });

    res.json({ queued: true, commentCount: comments.length });
  } catch (err) {
    next(err);
  }
});

// Get crisis alerts for the organization
sentimentRouter.get('/alerts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT el.id, el.payload, el.created_at
       FROM event_log el
       WHERE el.organization_id = $1
         AND el.source = 'crisis-shield'
       ORDER BY el.created_at DESC
       LIMIT 50`,
      [req.user!.organizationId]
    );

    res.json({ alerts: result.rows });
  } catch (err) {
    next(err);
  }
});

// Classify a single text (synchronous endpoint for UI)
sentimentRouter.post('/classify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'text field required' });
      return;
    }

    const result = classifySentiment(text);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
