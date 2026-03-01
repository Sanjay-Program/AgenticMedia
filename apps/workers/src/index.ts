/**
 * AgenticMedia Worker Entrypoint
 *
 * This process runs separately from the API server to handle heavy
 * background processing tasks:
 * - Scout Worker: Ingests social metrics and detects breakout creators
 * - Video Worker: Transcription, caption rendering, clip extraction (GPU-heavy)
 * - Sentiment Worker: Batch sentiment analysis for Crisis Shield
 *
 * DEPLOYMENT NOTE: The video worker should run on a GPU-optimized instance
 * with FFmpeg installed at the OS level. Scout and Sentiment workers can
 * run on standard compute instances.
 */

import { scoutWorker } from './scout-worker';
import { videoWorker } from './video-worker';
import { sentimentWorker } from './sentiment-worker';

console.log('AgenticMedia Workers starting...');

// Initialize all workers
const workers = [
  scoutWorker(),
  videoWorker(),
  sentimentWorker(),
];

console.log(`${workers.length} workers initialized and listening for jobs`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down workers...');
  for (const worker of workers) {
    await worker.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down workers...');
  for (const worker of workers) {
    await worker.close();
  }
  process.exit(0);
});
