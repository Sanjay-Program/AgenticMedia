import { v4 as uuidv4 } from 'uuid';
import { query } from '@agenticmedia/database';
import { publishEvent } from '../event-bus';
import { emitToOrganization } from '../websocket';
import { config } from '../../config';
import type {
  SentimentLabel,
  CrisisLevel,
  SentimentWindow,
  AnalyzeSentimentInput,
  EventType,
} from '@agenticmedia/shared-types';
import { CRISIS_THRESHOLDS } from '@agenticmedia/shared-types';

/**
 * Lightweight sentiment classifier using keyword-based heuristics.
 * In production, this would call an LLM or a dedicated ML model (e.g., Hugging Face).
 * This serves as a fast, zero-latency fallback that can process comments in bulk.
 */
export function classifySentiment(text: string): { sentiment: SentimentLabel; confidence: number; toxicityScore: number } {
  const lower = text.toLowerCase();

  // Toxic patterns (highest priority)
  const toxicPatterns = [
    /\b(hate|kill|die|threat|attack|racist|sexist|slur)\b/,
    /\b(disgusting|trash|worthless|scam|fraud|predator)\b/,
    /\b(cancel|cancelled|exposed|problematic|boycott)\b/,
  ];
  const toxicMatches = toxicPatterns.filter(p => p.test(lower)).length;
  if (toxicMatches >= 2) {
    return { sentiment: 'toxic', confidence: 0.85, toxicityScore: 0.9 };
  }

  // Negative patterns
  const negativePatterns = [
    /\b(bad|terrible|awful|horrible|worst|hate|ugly|boring|cringe|disappointed)\b/,
    /\b(dislike|unsubscribe|unfollowed|overrated|fake|clickbait|sellout)\b/,
    /\b(never again|waste of time|so bad|not good|don'?t like)\b/,
  ];
  const negativeMatches = negativePatterns.filter(p => p.test(lower)).length;

  // Positive patterns
  const positivePatterns = [
    /\b(love|amazing|awesome|great|best|incredible|fantastic|brilliant)\b/,
    /\b(helpful|inspiring|beautiful|perfect|excellent|outstanding)\b/,
    /\b(subscribe|follow|recommend|thank|❤️|🔥|💯|👏)\b/,
  ];
  const positiveMatches = positivePatterns.filter(p => p.test(lower)).length;

  const toxicityScore = Math.min(toxicMatches * 0.4, 1);

  if (negativeMatches > positiveMatches && negativeMatches >= 1) {
    return {
      sentiment: toxicMatches > 0 ? 'toxic' : 'negative',
      confidence: Math.min(0.6 + negativeMatches * 0.1, 0.95),
      toxicityScore,
    };
  }

  if (positiveMatches > negativeMatches && positiveMatches >= 1) {
    return {
      sentiment: 'positive',
      confidence: Math.min(0.6 + positiveMatches * 0.1, 0.95),
      toxicityScore,
    };
  }

  return { sentiment: 'neutral', confidence: 0.5, toxicityScore };
}

/**
 * Evaluates a sliding window of sentiments to determine crisis level.
 */
export function evaluateCrisisLevel(
  positiveCount: number,
  neutralCount: number,
  negativeCount: number,
  toxicCount: number
): CrisisLevel {
  const total = positiveCount + neutralCount + negativeCount + toxicCount;
  if (total < CRISIS_THRESHOLDS.MIN_COMMENTS_IN_WINDOW) {
    return 'normal';
  }

  const negativePercentage = ((negativeCount + toxicCount) / total) * 100;

  if (negativePercentage >= CRISIS_THRESHOLDS.CRITICAL_THRESHOLD) return 'critical';
  if (negativePercentage >= CRISIS_THRESHOLDS.WARNING_THRESHOLD) return 'warning';
  if (negativePercentage >= CRISIS_THRESHOLDS.WATCH_THRESHOLD) return 'watch';
  return 'normal';
}

/**
 * Processes a batch of comments for sentiment analysis and crisis detection.
 */
export async function analyzeSentimentBatch(
  input: AnalyzeSentimentInput
): Promise<SentimentWindow> {
  const { organizationId, creatorPlatformId, platform, comments } = input;

  let positiveCount = 0;
  let neutralCount = 0;
  let negativeCount = 0;
  let toxicCount = 0;

  for (const comment of comments) {
    const { sentiment, confidence, toxicityScore } = classifySentiment(comment.text);

    switch (sentiment) {
      case 'positive': positiveCount++; break;
      case 'neutral': neutralCount++; break;
      case 'negative': negativeCount++; break;
      case 'toxic': toxicCount++; break;
    }
  }

  const total = comments.length;
  const negativePercentage = total > 0 ? Math.round(((negativeCount + toxicCount) / total) * 100) : 0;
  const crisisLevel = evaluateCrisisLevel(positiveCount, neutralCount, negativeCount, toxicCount);

  const window: SentimentWindow = {
    creatorPlatformId,
    platform,
    windowMinutes: CRISIS_THRESHOLDS.WINDOW_MINUTES,
    totalComments: total,
    positiveCount,
    neutralCount,
    negativeCount,
    toxicCount,
    negativePercentage,
    crisisLevel,
  };

  // If crisis detected, trigger emergency actions
  if (crisisLevel === 'critical' || crisisLevel === 'warning') {
    try {
      const sampleTexts = comments
        .filter(c => {
          const s = classifySentiment(c.text);
          return s.sentiment === 'negative' || s.sentiment === 'toxic';
        })
        .slice(0, 3)
        .map(c => c.text);

      // Publish crisis event
      await publishEvent({
        organizationId,
        eventType: 'social.metric.updated' as EventType,
        source: 'crisis-shield',
        payload: {
          type: 'crisis_detected',
          crisisLevel,
          creatorPlatformId,
          platform,
          negativePercentage,
          sampleComments: sampleTexts,
          autoActions: crisisLevel === 'critical'
            ? ['pause_scheduled_content', 'notify_admin_email', 'notify_admin_sms']
            : ['notify_admin_email'],
        },
        idempotencyKey: `crisis-${creatorPlatformId}-${Date.now()}`,
      });

      // Real-time WebSocket alert
      emitToOrganization(organizationId, 'crisis:alert', {
        crisisLevel,
        creatorPlatformId,
        platform,
        negativePercentage,
        sampleComments: sampleTexts,
        timestamp: new Date().toISOString(),
      });

      // Auto-pause scheduled content on critical
      if (crisisLevel === 'critical') {
        try {
          await query(
            `UPDATE automation_workflows SET is_active = FALSE
             WHERE organization_id = $1 AND trigger_type LIKE 'social%' AND is_active = TRUE`,
            [organizationId]
          );
        } catch (err) {
          console.error('Failed to auto-pause automations:', err);
        }
      }
    } catch (err) {
      console.error('Failed to process crisis alert:', err);
    }
  }

  return window;
}
