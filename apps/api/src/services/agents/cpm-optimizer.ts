import type { DynamicCPM, CPMAdjustmentFactors } from '@agenticmedia/shared-types';
import { SEASONAL_MULTIPLIERS, INDUSTRY_BASE_CPM } from '@agenticmedia/shared-types';

/**
 * Calculates a dynamic CPM (Cost Per Mille) for a creator
 * based on multiple real-time factors rather than fixed rates.
 *
 * This replaces static pricing with AI-driven dynamic pricing that
 * accounts for seasonality, industry demand, engagement quality,
 * and conversion potential — ensuring agencies never underprice or
 * overprice their talent.
 *
 * @param creatorId - Creator UUID
 * @param platform - Social platform
 * @param input - Pricing input factors
 * @returns DynamicCPM with adjusted rate and confidence
 */
export function calculateDynamicCPM(
  creatorId: string,
  platform: string,
  input: CPMInput
): DynamicCPM {
  const baseCPM = input.historicalCPM > 0
    ? input.historicalCPM
    : INDUSTRY_BASE_CPM[input.industry] || INDUSTRY_BASE_CPM.default;

  // Calculate adjustment factors
  const factors = calculateAdjustmentFactors(input);

  // Apply all multipliers
  const combinedMultiplier =
    factors.seasonality *
    factors.industryDemand *
    factors.engagementQuality *
    factors.brandBudgetFit *
    factors.conversionPotential;

  const adjustedCPM = Math.round(baseCPM * combinedMultiplier * 100) / 100;

  // Confidence based on amount of historical data
  const confidence = calculateConfidence(input);

  return {
    creatorId,
    platform,
    baseCPM,
    adjustedCPM,
    adjustmentFactors: factors,
    confidence,
    calculatedAt: new Date().toISOString(),
  };
}

export interface CPMInput {
  /** Creator's historical average CPM (0 if unknown) */
  historicalCPM: number;
  /** Creator's average engagement rate */
  engagementRate: number;
  /** Industry vertical of the campaign */
  industry: string;
  /** Month number (1-12) for seasonality */
  currentMonth: number;
  /** Number of historical campaigns for this creator */
  historicalCampaignCount: number;
  /** Brand's average budget (0 if unknown) */
  brandAvgBudget: number;
  /** Creator's audience demographics match (0-1) */
  audienceMatch: number;
  /** Creator's content conversion rate (0-1, 0 if unknown) */
  conversionRate: number;
}

function calculateAdjustmentFactors(input: CPMInput): CPMAdjustmentFactors {
  // Seasonality: Q4 commands higher rates
  const quarter = Math.ceil(input.currentMonth / 3);
  const seasonality = SEASONAL_MULTIPLIERS[quarter] || 1.0;

  // Industry demand: some industries pay more
  const industryBase = INDUSTRY_BASE_CPM[input.industry] || INDUSTRY_BASE_CPM.default;
  const industryDemand = industryBase / INDUSTRY_BASE_CPM.default;

  // Engagement quality: higher engagement = premium
  const engagementQuality = input.engagementRate > 0.05
    ? 1.0 + Math.min((input.engagementRate - 0.05) * 5, 0.5)
    : input.engagementRate > 0.02
    ? 1.0
    : 0.85;

  // Brand budget fit: larger budgets indicate willingness to pay premium
  const brandBudgetFit = input.brandAvgBudget > 50000
    ? 1.15
    : input.brandAvgBudget > 20000
    ? 1.05
    : 1.0;

  // Conversion potential: proven converters command premiums
  const conversionPotential = input.conversionRate > 0.03
    ? 1.2
    : input.conversionRate > 0.01
    ? 1.1
    : input.conversionRate > 0
    ? 1.0
    : 0.95; // No conversion data → slight discount

  return {
    seasonality: Math.round(seasonality * 100) / 100,
    industryDemand: Math.round(industryDemand * 100) / 100,
    engagementQuality: Math.round(engagementQuality * 100) / 100,
    brandBudgetFit: Math.round(brandBudgetFit * 100) / 100,
    conversionPotential: Math.round(conversionPotential * 100) / 100,
  };
}

/**
 * Confidence level based on how much data we have.
 * More historical campaigns = higher confidence.
 */
function calculateConfidence(input: CPMInput): number {
  let confidence = 0.3; // Base confidence

  if (input.historicalCPM > 0) confidence += 0.2;
  if (input.historicalCampaignCount >= 5) confidence += 0.2;
  else if (input.historicalCampaignCount >= 2) confidence += 0.1;
  if (input.conversionRate > 0) confidence += 0.15;
  if (input.audienceMatch > 0.5) confidence += 0.15;

  return Math.round(Math.min(1, confidence) * 100) / 100;
}
