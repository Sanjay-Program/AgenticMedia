import { v4 as uuidv4 } from 'uuid';
import { query } from '@agenticmedia/database';
import { emitToOrganization } from './websocket';
import { config } from '../config';
import type {
  VideoJobStatus,
  CreateVideoJobInput,
  ClipTimestamp,
  TargetPlatform,
  PlatformMetadata,
} from '@agenticmedia/shared-types';
import { PLATFORM_FORMATS } from '@agenticmedia/shared-types';

/**
 * Creates a video processing job and returns the job ID.
 * The actual heavy processing runs on the dedicated video worker (apps/workers).
 */
export async function createVideoJob(
  input: CreateVideoJobInput
): Promise<{ jobId: string }> {
  const jobId = uuidv4();

  await query(
    `INSERT INTO video_jobs (id, organization_id, user_id, job_type, status, source_file_key, metadata)
     VALUES ($1, $2, $3, $4, 'queued', $5, $6)`,
    [
      jobId,
      input.organizationId,
      input.userId,
      input.jobType,
      input.sourceFileKey,
      JSON.stringify({ targetPlatforms: input.targetPlatforms || [] }),
    ]
  );

  return { jobId };
}

/**
 * Updates video job status and emits WebSocket progress events.
 */
export async function updateVideoJobStatus(
  jobId: string,
  organizationId: string,
  status: VideoJobStatus,
  progress: number,
  additionalData?: Record<string, unknown>
): Promise<void> {
  const updates: string[] = ['status = $1', 'progress = $2'];
  const params: unknown[] = [status, progress, jobId];
  let idx = 4;

  if (status === 'completed' || status === 'failed') {
    updates.push(`completed_at = NOW()`);
  }
  if (additionalData?.errorMessage) {
    updates.push(`error_message = $${idx++}`);
    params.splice(params.length - 1, 0, additionalData.errorMessage);
  }

  await query(
    `UPDATE video_jobs SET ${updates.join(', ')} WHERE id = $${params.length}`,
    params
  );

  // Emit real-time progress to the frontend
  emitToOrganization(organizationId, 'video:progress', {
    jobId,
    status,
    progress,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Generates FFmpeg command arguments for burning word-by-word captions onto a video.
 * This returns the command arguments as an array for use with child_process.spawn.
 *
 * @param inputPath - Path to the source video
 * @param srtPath - Path to the SRT subtitle file
 * @param outputPath - Path for the output video
 * @param style - Caption styling options
 */
export function buildCaptionOverlayCommand(
  inputPath: string,
  srtPath: string,
  outputPath: string,
  style: {
    fontName?: string;
    fontSize?: number;
    primaryColor?: string;
    outlineColor?: string;
    borderStyle?: number;
  } = {}
): string[] {
  const {
    fontName = 'Arial',
    fontSize = 24,
    primaryColor = '&H00FFFFFF',  // White in ASS format
    outlineColor = '&H00000000',  // Black outline
    borderStyle = 3,
  } = style;

  const subtitleFilter = `subtitles=${srtPath}:force_style='FontName=${fontName},FontSize=${fontSize},PrimaryColour=${primaryColor},OutlineColour=${outlineColor},BorderStyle=${borderStyle},Outline=2,Shadow=1'`;

  return [
    '-i', inputPath,
    '-vf', subtitleFilter,
    '-c:a', 'copy',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-y',
    outputPath,
  ];
}

/**
 * Generates FFmpeg command arguments for cropping/resizing video to a target platform format.
 */
export function buildFormatAdaptCommand(
  inputPath: string,
  outputPath: string,
  targetPlatform: TargetPlatform
): string[] {
  const format = PLATFORM_FORMATS[targetPlatform];
  const { width, height } = format.resolution;

  // Calculate crop filter based on aspect ratio
  const scaleFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`;

  const args = [
    '-i', inputPath,
    '-vf', scaleFilter,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
  ];

  // Apply platform-specific duration limits
  if (format.maxDuration < 43200) {
    args.push('-t', format.maxDuration.toString());
  }

  args.push('-y', outputPath);
  return args;
}

/**
 * Uses an LLM to identify the most viral 30-second clips from a transcript.
 * Returns timestamps for the top 3 most engaging segments.
 */
export async function identifyViralClips(
  transcript: string,
  videoDurationSeconds: number
): Promise<ClipTimestamp[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: config.DEFAULT_LLM_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are an expert viral video editor. Analyze the transcript and identify the 3 most engaging 30-second clips that would perform best as short-form content on TikTok/Reels/Shorts.

Respond ONLY with valid JSON array:
[
  {
    "startSeconds": number,
    "endSeconds": number,
    "viralityScore": number (0-100),
    "reason": "string explaining why this clip would go viral"
  }
]

Rules:
- Each clip must be 20-60 seconds long
- Clips should not overlap
- Prioritize emotional moments, humor, controversial takes, or surprising revelations
- startSeconds and endSeconds must be within the video duration (${videoDurationSeconds}s)`,
          },
          {
            role: 'user',
            content: `Transcript:\n${transcript.substring(0, 8000)}`,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      console.error('LLM clip identification failed:', response.status);
      return [];
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices?.[0]?.message?.content || '[]';
    const parsed = JSON.parse(content);
    const clips = Array.isArray(parsed) ? parsed : parsed.clips || [];

    return clips.map((clip: Record<string, unknown>) => ({
      startSeconds: Number(clip.startSeconds) || 0,
      endSeconds: Number(clip.endSeconds) || 30,
      viralityScore: Number(clip.viralityScore) || 50,
      reason: String(clip.reason || 'High engagement potential'),
    }));
  } catch (err) {
    console.error('Failed to identify viral clips:', err);
    return [];
  }
}

/**
 * Uses an LLM to generate platform-specific metadata for a content piece.
 */
export async function generatePlatformMetadata(
  transcript: string,
  targetPlatform: TargetPlatform,
  creatorName: string
): Promise<PlatformMetadata> {
  const platformInstructions: Record<TargetPlatform, string> = {
    tiktok: 'Create a catchy, hashtag-heavy caption (max 150 chars). Use trending TikTok hashtags. Be casual and engaging.',
    youtube_shorts: 'Create a click-worthy title (max 100 chars) and short description. Use SEO-friendly keywords.',
    instagram_reels: 'Create an engaging caption with emojis and relevant hashtags. Professional but approachable tone.',
    linkedin: 'Create a professional, thought-leadership summary. No hashtags except 2-3 industry-relevant ones.',
    youtube: 'Create an SEO-optimized title (max 100 chars) and detailed description (max 500 chars). Include relevant keywords.',
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: config.DEFAULT_LLM_MODEL,
        messages: [
          {
            role: 'system',
            content: `You generate social media metadata for content creators. Respond ONLY with valid JSON:
{
  "title": "string",
  "description": "string",
  "hashtags": ["string"]
}

Platform: ${targetPlatform}
Instructions: ${platformInstructions[targetPlatform]}
Creator: ${creatorName}`,
          },
          {
            role: 'user',
            content: `Content transcript excerpt:\n${transcript.substring(0, 2000)}`,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      return defaultMetadata(targetPlatform);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return {
      platform: targetPlatform,
      title: String(parsed.title || 'Untitled'),
      description: String(parsed.description || ''),
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map(String) : [],
    };
  } catch {
    return defaultMetadata(targetPlatform);
  }
}

function defaultMetadata(platform: TargetPlatform): PlatformMetadata {
  return {
    platform,
    title: 'New Content',
    description: '',
    hashtags: [],
  };
}
