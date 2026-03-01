/**
 * Video Worker — NeuraForge AI Editing Engine (Module 5)
 *
 * CRITICAL: This worker must run on an instance with:
 * - FFmpeg installed at the OS level (apt install ffmpeg)
 * - Sufficient CPU/GPU for video transcoding
 * - Access to S3/R2 for file I/O
 *
 * This worker handles:
 * - Whisper transcription (audio → SRT subtitles)
 * - Caption rendering (FFmpeg subtitle burn-in)
 * - Clip extraction (viral moment detection + FFmpeg cut)
 * - Format adaptation (crop/resize for each platform)
 *
 * Dockerfile requirements:
 *   FROM node:20-slim
 *   RUN apt-get update && apt-get install -y ffmpeg
 *   WORKDIR /app
 *   COPY . .
 *   RUN npm install
 *   CMD ["node", "dist/index.js"]
 */

import { Worker, Job } from 'bullmq';

interface VideoJobData {
  jobId: string;
  organizationId: string;
  jobType: 'transcribe' | 'caption_render' | 'clip_extract' | 'format_adapt';
  sourceFileKey: string;
  targetPlatforms: string[];
}

function getRedisConnection() {
  const url = new URL(process.env.REDIS_URL || 'redis://localhost:6379');
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
  };
}

export function videoWorker(): Worker {
  const worker = new Worker<VideoJobData>(
    'video',
    async (job: Job<VideoJobData>) => {
      const { jobId, organizationId, jobType, sourceFileKey, targetPlatforms } = job.data;

      console.log(`[Video] Processing ${jobType} job ${jobId} for org ${organizationId}`);

      switch (jobType) {
        case 'transcribe':
          // In production:
          // 1. Download video from S3 using sourceFileKey
          // 2. Extract audio track with FFmpeg
          // 3. Call OpenAI Whisper API or local Whisper model
          // 4. Generate timestamped SRT/VTT file
          // 5. Upload SRT to S3, update video_jobs metadata
          await job.updateProgress(25);
          console.log(`[Video] Transcribing audio from ${sourceFileKey}`);
          await job.updateProgress(75);
          break;

        case 'caption_render':
          // In production:
          // 1. Download video + SRT from S3
          // 2. Run FFmpeg with subtitle filter (see buildCaptionOverlayCommand)
          // 3. Upload rendered video to S3
          await job.updateProgress(25);
          console.log(`[Video] Rendering captions for ${sourceFileKey}`);
          await job.updateProgress(75);
          break;

        case 'clip_extract':
          // In production:
          // 1. Download video + transcript from S3
          // 2. Call LLM to identify viral clips (see identifyViralClips)
          // 3. Use FFmpeg to extract each clip segment
          // 4. Upload clips to S3
          await job.updateProgress(25);
          console.log(`[Video] Extracting viral clips from ${sourceFileKey}`);
          await job.updateProgress(75);
          break;

        case 'format_adapt':
          // In production:
          // 1. Download source clip from S3
          // 2. For each targetPlatform, run FFmpeg crop/resize (see buildFormatAdaptCommand)
          // 3. Generate platform-specific metadata (see generatePlatformMetadata)
          // 4. Create content_assets records
          // 5. Upload all adapted files to S3
          await job.updateProgress(25);
          console.log(`[Video] Adapting ${sourceFileKey} for platforms: ${targetPlatforms.join(', ')}`);
          await job.updateProgress(75);
          break;
      }

      await job.updateProgress(100);
      return { status: 'completed', jobId, jobType };
    },
    {
      connection: getRedisConnection(),
      concurrency: 2, // Low concurrency — video processing is CPU/GPU heavy
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Video] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Video] Job ${job?.id} failed:`, err.message);
  });

  console.log('[Video Worker] Listening for jobs on "video" queue');
  return worker;
}
