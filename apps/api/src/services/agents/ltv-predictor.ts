/**
 * Creator Lifetime Value Predictor
 *
 * Predicts 6-month and 12-month revenue, growth trajectory,
 * and burnout/plateau risk for investment-grade analytics.
 */

import type { CreatorLTVPrediction } from '@agenticmedia/shared-types';
import { classifyGrowthTrajectory } from '@agenticmedia/shared-types';

export interface LTVPredictionInput {
  creatorId: string;
  organizationId: string;
  monthlyRevenues: number[];      // last 6+ months of revenue
  followerGrowthRate: number;     // monthly growth rate (0.05 = 5%)
  engagementRate: number;         // 0-1
  platformCount: number;          // number of active platforms
  avgCampaignValue: number;
  campaignsPerMonth: number;
  contentFrequency: number;       // posts per week
  monthsActive: number;
}

/** Predict lifetime value for a creator */
export function predictCreatorLTV(input: LTVPredictionInput): CreatorLTVPrediction {
  const { monthlyRevenues } = input;
  const recentMonths = monthlyRevenues.slice(-6);
  const avgMonthlyRevenue = recentMonths.length > 0
    ? recentMonths.reduce((a, b) => a + b, 0) / recentMonths.length
    : 0;

  // Growth rate from revenue trend
  const revenueGrowthRate = recentMonths.length >= 2
    ? calculateGrowthRate(recentMonths)
    : input.followerGrowthRate;

  // 6-month projection with growth curve
  const sixMonthRevenue = projectRevenue(avgMonthlyRevenue, revenueGrowthRate, 6);

  // 12-month projection (apply growth decay at month 6+)
  const decayedGrowthRate = revenueGrowthRate * 0.7; // Growth decays over time
  const twelveMonthRevenue = sixMonthRevenue + projectRevenue(
    avgMonthlyRevenue * Math.pow(1 + revenueGrowthRate, 6),
    decayedGrowthRate,
    6
  );

  // Viral probability based on engagement + growth
  const viralProbability = Math.min(
    (input.engagementRate * 0.4 + input.followerGrowthRate * 2 + (input.platformCount > 2 ? 0.1 : 0)) ,
    0.95
  );

  // Plateau risk = diminishing growth + high months active
  const plateauRiskScore = Math.min(
    Math.max(0, (input.monthsActive / 24) * 30 + (revenueGrowthRate < 0.02 ? 30 : 0) + (input.contentFrequency < 2 ? 20 : 0)),
    100
  );

  // Burnout risk = high frequency + low engagement trend
  const burnoutRiskScore = Math.min(
    Math.max(0, (input.contentFrequency > 7 ? 25 : 0) + (input.engagementRate < 0.02 ? 30 : 0) + (revenueGrowthRate < 0 ? 25 : 0)),
    100
  );

  // Confidence based on data availability
  const confidenceScore = Math.min(
    (recentMonths.length / 6) * 0.4 + (input.monthsActive > 6 ? 0.3 : input.monthsActive * 0.05) + (input.platformCount > 1 ? 0.2 : 0.1),
    1
  );

  return {
    creatorId: input.creatorId,
    organizationId: input.organizationId,
    sixMonthRevenue: Math.round(sixMonthRevenue * 100) / 100,
    twelveMonthRevenue: Math.round(twelveMonthRevenue * 100) / 100,
    viralProbability: Math.round(viralProbability * 1000) / 1000,
    plateauRiskScore: Math.round(plateauRiskScore),
    burnoutRiskScore: Math.round(burnoutRiskScore),
    growthTrajectory: classifyGrowthTrajectory(revenueGrowthRate),
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    predictedAt: new Date().toISOString(),
  };
}

/** Calculate monthly growth rate from revenue array */
function calculateGrowthRate(revenues: number[]): number {
  if (revenues.length < 2) return 0;
  const first = revenues[0];
  const last = revenues[revenues.length - 1];
  if (first <= 0) return last > 0 ? 0.5 : 0;
  return (last - first) / (first * revenues.length);
}

/** Project cumulative revenue over N months with constant growth */
function projectRevenue(baseMonthly: number, growthRate: number, months: number): number {
  let total = 0;
  for (let i = 0; i < months; i++) {
    total += baseMonthly * Math.pow(1 + growthRate, i);
  }
  return total;
}
