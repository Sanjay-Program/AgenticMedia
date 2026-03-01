// AI Content Production Empire types

/** Viral Hook Generator */
export interface ViralHookSuggestion {
  originalHook: string;
  suggestedHook: string;
  retentionPrediction: number; // 0-1 predicted viewer retention
  emotionalTrigger: string;
  confidenceScore: number; // 0-1
}

/** Thumbnail Intelligence System */
export interface ThumbnailVariant {
  id: string;
  imageUrl: string;
  predictedCTR: number; // 0-1
  dominantColors: string[];
  hasText: boolean;
  hasFace: boolean;
  emotionalAppeal: string;
}

export interface ThumbnailTestResult {
  contentId: string;
  variants: ThumbnailVariant[];
  winnerId: string | null;
  actualCTRs: Record<string, number>;
  testDuration: number; // hours
  status: 'pending' | 'running' | 'completed';
  createdAt: string;
}

/** Multi-Language Voice Cloning */
export type SupportedLanguage =
  | 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ja' | 'ko' | 'hi' | 'ar' | 'zh';

export interface VoiceCloneJob {
  id: string;
  creatorId: string;
  sourceVideoUrl: string;
  targetLanguages: SupportedLanguage[];
  lipSyncEnabled: boolean;
  culturalAdaptation: boolean;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  outputUrls: Record<string, string>;
  createdAt: string;
}

/** AI Script Writing Studio */
export type ScriptFormat = 'youtube_short' | 'youtube_long' | 'tiktok' | 'linkedin' | 'podcast' | 'newsletter';

export interface ScriptRequest {
  creatorId: string;
  format: ScriptFormat;
  topic: string;
  targetAudience: string;
  toneOfVoice: string;
  lengthMinutes: number;
}

export interface GeneratedScript {
  id: string;
  creatorId: string;
  format: ScriptFormat;
  title: string;
  hook: string;
  body: string;
  callToAction: string;
  estimatedDuration: number; // seconds
  viralProbability: number; // 0-1
  trendAlignment: number; // 0-1
  generatedAt: string;
}

/** Content AI Job (unified tracker) */
export type ContentAIJobType = 'hook_rewrite' | 'thumbnail_test' | 'voice_clone' | 'script_write';
export type ContentAIJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ContentAIJob {
  id: string;
  organizationId: string;
  creatorId: string;
  type: ContentAIJobType;
  status: ContentAIJobStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  tokensUsed: number;
  costEstimate: number;
  createdAt: string;
  completedAt: string | null;
}

/** Predict hook retention score from text features */
export function predictHookRetention(hookText: string): number {
  let score = 0.30; // baseline

  // Question hooks increase retention
  if (hookText.includes('?')) score += 0.10;

  // Numbers / data increase credibility
  if (/\d+/.test(hookText)) score += 0.08;

  // Emotional triggers
  const emotionalWords = ['secret', 'nobody', 'shocking', 'mistake', 'truth', 'why', 'how', 'never', 'always', 'stop'];
  const hookLower = hookText.toLowerCase();
  const emotionalHits = emotionalWords.filter(w => hookLower.includes(w)).length;
  score += Math.min(emotionalHits * 0.05, 0.20);

  // Short hooks perform better (under 60 chars)
  if (hookText.length <= 60) score += 0.07;
  if (hookText.length <= 40) score += 0.05;

  // Capitalize first word = authority
  if (hookText[0] === hookText[0]?.toUpperCase()) score += 0.03;

  return Math.min(score, 0.95);
}

/** Predict thumbnail CTR from features */
export function predictThumbnailCTR(hasText: boolean, hasFace: boolean, colorCount: number): number {
  let ctr = 0.02; // 2% baseline
  if (hasFace) ctr += 0.015;
  if (hasText) ctr += 0.010;
  if (colorCount >= 3 && colorCount <= 5) ctr += 0.005;
  return Math.round(ctr * 10000) / 10000;
}
