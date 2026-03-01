// Enterprise V2: Brand Safety & Viral Probability Types

export type BrandSafetyLevel = 'safe' | 'low_risk' | 'medium_risk' | 'high_risk' | 'unsafe';
export type ContentCategory =
  | 'politics'
  | 'adult'
  | 'violence'
  | 'hate_speech'
  | 'drugs'
  | 'gambling'
  | 'misinformation'
  | 'trademark'
  | 'profanity'
  | 'controversial';

export interface BrandSafetyResult {
  videoJobId: string;
  overallLevel: BrandSafetyLevel;
  score: number; // 0-100 (100 = perfectly safe)
  flags: BrandSafetyFlag[];
  scannedAt: string;
}

export interface BrandSafetyFlag {
  category: ContentCategory;
  severity: 'low' | 'medium' | 'high';
  description: string;
  timestamp?: number; // seconds into video where detected
  confidence: number; // 0-1
}

export interface ViralProbabilityScore {
  contentId: string;
  platform: string;
  overallProbability: number; // 0-100 percentage
  factors: ViralFactor[];
  suggestions: ViralSuggestion[];
  calculatedAt: string;
}

export interface ViralFactor {
  name: string;
  score: number; // 0-100
  weight: number; // contribution weight
  description: string;
}

export interface ViralSuggestion {
  type: 'hook' | 'title' | 'thumbnail' | 'timing' | 'hashtag' | 'cta';
  priority: 'low' | 'medium' | 'high';
  suggestion: string;
  expectedImpact: number; // percentage improvement
}

export const BRAND_SAFETY_THRESHOLDS = {
  /** Score below this = unsafe */
  UNSAFE: 20,
  /** Score below this = high risk */
  HIGH_RISK: 40,
  /** Score below this = medium risk */
  MEDIUM_RISK: 60,
  /** Score below this = low risk */
  LOW_RISK: 80,
  /** Above this = safe */
  SAFE: 80,
} as const;

export function classifyBrandSafety(score: number): BrandSafetyLevel {
  if (score >= BRAND_SAFETY_THRESHOLDS.SAFE) return 'safe';
  if (score >= BRAND_SAFETY_THRESHOLDS.MEDIUM_RISK) return 'low_risk';
  if (score >= BRAND_SAFETY_THRESHOLDS.HIGH_RISK) return 'medium_risk';
  if (score >= BRAND_SAFETY_THRESHOLDS.UNSAFE) return 'high_risk';
  return 'unsafe';
}
