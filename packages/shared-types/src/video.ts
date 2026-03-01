// Module 5 & 6: NeuraForge Video Engine & Chameleon Publishing Matrix Types

export type VideoJobType = 'transcribe' | 'caption_render' | 'clip_extract' | 'format_adapt';
export type VideoJobStatus = 'queued' | 'transcribing' | 'rendering_captions' | 'clipping' | 'adapting' | 'uploading' | 'completed' | 'failed';

export interface VideoJob {
  id: string;
  organizationId: string;
  userId: string;
  jobType: VideoJobType;
  status: VideoJobStatus;
  sourceFileKey: string;
  outputFileKeys: string[];
  progress: number;
  metadata: VideoJobMetadata;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface VideoJobMetadata {
  duration?: number;
  resolution?: string;
  format?: string;
  transcriptSrt?: string;
  clipTimestamps?: ClipTimestamp[];
  targetPlatforms?: TargetPlatform[];
}

export interface ClipTimestamp {
  startSeconds: number;
  endSeconds: number;
  viralityScore: number;
  reason: string;
}

export type TargetPlatform = 'tiktok' | 'youtube_shorts' | 'instagram_reels' | 'linkedin' | 'youtube';

export interface PlatformFormat {
  platform: TargetPlatform;
  aspectRatio: string;
  maxDuration: number;
  resolution: { width: number; height: number };
}

/**
 * Platform-specific format configurations for the Chameleon Publishing Matrix.
 */
export const PLATFORM_FORMATS: Record<TargetPlatform, PlatformFormat> = {
  tiktok: {
    platform: 'tiktok',
    aspectRatio: '9:16',
    maxDuration: 180,
    resolution: { width: 1080, height: 1920 },
  },
  youtube_shorts: {
    platform: 'youtube_shorts',
    aspectRatio: '9:16',
    maxDuration: 60,
    resolution: { width: 1080, height: 1920 },
  },
  instagram_reels: {
    platform: 'instagram_reels',
    aspectRatio: '9:16',
    maxDuration: 90,
    resolution: { width: 1080, height: 1920 },
  },
  linkedin: {
    platform: 'linkedin',
    aspectRatio: '1:1',
    maxDuration: 600,
    resolution: { width: 1080, height: 1080 },
  },
  youtube: {
    platform: 'youtube',
    aspectRatio: '16:9',
    maxDuration: 43200,
    resolution: { width: 1920, height: 1080 },
  },
};

export interface ContentAsset {
  id: string;
  organizationId: string;
  videoJobId: string;
  platform: TargetPlatform;
  fileKey: string;
  title: string;
  description: string;
  hashtags: string[];
  publishStatus: ContentPublishStatus;
  publishedAt: string | null;
  createdAt: string;
}

export type ContentPublishStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';

export interface PlatformMetadata {
  platform: TargetPlatform;
  title: string;
  description: string;
  hashtags: string[];
  thumbnailKey?: string;
}

export interface CreateVideoJobInput {
  organizationId: string;
  userId: string;
  jobType: VideoJobType;
  sourceFileKey: string;
  targetPlatforms?: TargetPlatform[];
}
