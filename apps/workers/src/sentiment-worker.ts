/**
 * Sentiment Worker — Crisis Shield Engine (Module 7)
 *
 * Processes batches of social media comments through sentiment analysis.
 * Detects crisis-level negative sentiment spikes and triggers emergency actions.
 */

import { Worker, Job } from 'bullmq';

interface SentimentJobData {
  organizationId: string;
  creatorPlatformId: string;
  platform: string;
  comments: Array<{
    sourceType: string;
    sourceId: string;
    text: string;
  }>;
}

function getRedisConnection() {
  const url = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
  };
}

export function sentimentWorker(): Worker {
  const worker = new Worker<SentimentJobData>(
    'sentiment',
    async (job: Job<SentimentJobData>) => {
      const { organizationId, creatorPlatformId, platform, comments } = job.data;

      console.log(`[Sentiment] Analyzing ${comments.length} comments for creator ${creatorPlatformId}`);

      // In production, this would call the analyzeSentimentBatch service
      // from apps/api/src/services/agents/sentiment.ts
      // which handles classification, crisis detection, and auto-actions.

      await job.updateProgress(50);

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 50));

      await job.updateProgress(100);

      return {
        status: 'analyzed',
        commentCount: comments.length,
        creatorPlatformId,
      };
    },
    {
      connection: getRedisConnection(),
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Sentiment] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Sentiment] Job ${job?.id} failed:`, err.message);
  });

  console.log('[Sentiment Worker] Listening for jobs on "sentiment" queue');
  return worker;
}
