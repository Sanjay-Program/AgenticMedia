import type { BrandSafetyResult, BrandSafetyFlag, ContentCategory } from '@agenticmedia/shared-types';
import { classifyBrandSafety, BRAND_SAFETY_THRESHOLDS } from '@agenticmedia/shared-types';

/**
 * Scans text content (transcript, captions, description) for brand safety issues.
 * This is a keyword-based initial scan; in production, this would also invoke
 * an LLM or dedicated content moderation API for deeper analysis.
 */
export function scanContentForBrandSafety(
  videoJobId: string,
  transcript: string,
  metadata?: { title?: string; description?: string; tags?: string[] }
): BrandSafetyResult {
  const flags: BrandSafetyFlag[] = [];
  const combinedText = [
    transcript,
    metadata?.title || '',
    metadata?.description || '',
    ...(metadata?.tags || []),
  ].join(' ').toLowerCase();

  // Check each category
  for (const [category, keywords] of Object.entries(BRAND_SAFETY_KEYWORDS)) {
    const matches = keywords.filter(kw => combinedText.includes(kw));
    if (matches.length > 0) {
      const severity = matches.length >= 3 ? 'high' : matches.length >= 2 ? 'medium' : 'low';
      flags.push({
        category: category as ContentCategory,
        severity,
        description: `Detected ${matches.length} ${category}-related term(s) in content`,
        confidence: Math.min(0.5 + matches.length * 0.15, 0.95),
      });
    }
  }

  // Calculate safety score: start at 100 and deduct for each flag
  let score = 100;
  for (const flag of flags) {
    switch (flag.severity) {
      case 'high': score -= 25; break;
      case 'medium': score -= 15; break;
      case 'low': score -= 8; break;
    }
  }
  score = Math.max(0, Math.min(100, score));

  return {
    videoJobId,
    overallLevel: classifyBrandSafety(score),
    score,
    flags,
    scannedAt: new Date().toISOString(),
  };
}

/**
 * Calculates a viral probability score for a piece of content based on
 * observable content characteristics.
 */
export function calculateViralProbability(
  contentId: string,
  platform: string,
  input: ViralInput
): import('@agenticmedia/shared-types').ViralProbabilityScore {
  const factors: import('@agenticmedia/shared-types').ViralFactor[] = [];
  const suggestions: import('@agenticmedia/shared-types').ViralSuggestion[] = [];

  // Hook strength (first 3 seconds)
  const hookScore = input.hasStrongHook ? 85 : input.hookLength <= 3 ? 60 : 40;
  factors.push({
    name: 'Hook Strength',
    score: hookScore,
    weight: 0.25,
    description: input.hasStrongHook ? 'Strong attention-grabbing hook' : 'Hook could be more compelling',
  });
  if (hookScore < 70) {
    suggestions.push({
      type: 'hook',
      priority: 'high',
      suggestion: 'Lead with a provocative question, surprising stat, or bold claim in the first 3 seconds',
      expectedImpact: 25,
    });
  }

  // Title quality
  const titleScore = input.titleLength >= 30 && input.titleLength <= 80 ? 75 : 50;
  factors.push({
    name: 'Title Quality',
    score: titleScore,
    weight: 0.20,
    description: titleScore >= 70 ? 'Title length is optimal' : 'Title could be optimized',
  });
  if (titleScore < 70) {
    suggestions.push({
      type: 'title',
      priority: 'medium',
      suggestion: 'Optimize title to 40-70 characters with a power word or number',
      expectedImpact: 15,
    });
  }

  // Content length match for platform
  const idealLength = PLATFORM_IDEAL_DURATION[platform] || 60;
  const durationDiff = Math.abs(input.durationSeconds - idealLength) / idealLength;
  const durationScore = durationDiff < 0.2 ? 85 : durationDiff < 0.5 ? 65 : 40;
  factors.push({
    name: 'Duration Fit',
    score: durationScore,
    weight: 0.15,
    description: `Content duration ${durationScore >= 70 ? 'fits' : 'may not fit'} platform ideal (${idealLength}s)`,
  });

  // Trending topic alignment
  const trendScore = input.usesTrendingTopic ? 80 : 50;
  factors.push({
    name: 'Trend Alignment',
    score: trendScore,
    weight: 0.20,
    description: input.usesTrendingTopic ? 'Content aligns with current trends' : 'No trending topic detected',
  });
  if (trendScore < 70) {
    suggestions.push({
      type: 'hashtag',
      priority: 'medium',
      suggestion: 'Incorporate trending hashtags or topics relevant to your niche',
      expectedImpact: 20,
    });
  }

  // CTA quality
  const ctaScore = input.hasCallToAction ? 75 : 35;
  factors.push({
    name: 'Call to Action',
    score: ctaScore,
    weight: 0.20,
    description: input.hasCallToAction ? 'Clear CTA present' : 'No clear call to action detected',
  });
  if (ctaScore < 70) {
    suggestions.push({
      type: 'cta',
      priority: 'high',
      suggestion: 'Add a clear call to action (like, comment, share) within the first 10 seconds',
      expectedImpact: 18,
    });
  }

  // Calculate weighted overall probability
  const overallProbability = Math.round(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0)
  );

  return {
    contentId,
    platform,
    overallProbability,
    factors,
    suggestions,
    calculatedAt: new Date().toISOString(),
  };
}

export interface ViralInput {
  hasStrongHook: boolean;
  hookLength: number; // seconds
  titleLength: number;
  durationSeconds: number;
  usesTrendingTopic: boolean;
  hasCallToAction: boolean;
}

const PLATFORM_IDEAL_DURATION: Record<string, number> = {
  tiktok: 30,
  youtube_shorts: 45,
  instagram_reels: 30,
  youtube: 480,
  linkedin: 120,
};

/**
 * Keyword sets for brand safety detection.
 * In production, these would be augmented by ML models.
 */
const BRAND_SAFETY_KEYWORDS: Record<string, string[]> = {
  politics: ['election', 'democrat', 'republican', 'political', 'president', 'congress', 'partisan'],
  violence: ['kill', 'murder', 'assault', 'weapon', 'gun violence', 'attack', 'bomb'],
  hate_speech: ['racist', 'sexist', 'homophobic', 'slur', 'discriminat', 'bigot'],
  drugs: ['cocaine', 'heroin', 'meth', 'drug abuse', 'overdose', 'narcotics'],
  gambling: ['gambling', 'casino', 'betting odds', 'slot machine', 'poker tournament'],
  profanity: ['fuck', 'shit', 'damn', 'ass', 'bastard', 'crap'],
  controversial: ['conspiracy', 'hoax', 'scandal', 'coverup', 'exposed', 'cancelled'],
};
