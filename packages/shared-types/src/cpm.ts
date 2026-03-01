// Enterprise V2: Dynamic CPM Optimizer Types

export interface DynamicCPM {
  creatorId: string;
  platform: string;
  baseCPM: number;
  adjustedCPM: number;
  adjustmentFactors: CPMAdjustmentFactors;
  confidence: number; // 0-1 confidence level
  calculatedAt: string;
}

export interface CPMAdjustmentFactors {
  /** Seasonal demand multiplier (e.g., Q4 holiday season = higher) */
  seasonality: number;
  /** Industry vertical demand (e.g., tech vs. fashion) */
  industryDemand: number;
  /** Creator's engagement quality vs. peers */
  engagementQuality: number;
  /** Brand's historical budget patterns */
  brandBudgetFit: number;
  /** Predicted conversion likelihood */
  conversionPotential: number;
}

export interface CPMHistoricalRecord {
  creatorId: string;
  campaignId: string;
  platform: string;
  impressions: number;
  earnings: number;
  actualCPM: number;
  industry: string;
  recordedAt: string;
}

/**
 * Seasonal multipliers by quarter. Q4 is highest due to holiday advertising demand.
 */
export const SEASONAL_MULTIPLIERS: Record<number, number> = {
  1: 0.85,  // Q1 — post-holiday slowdown
  2: 0.95,  // Q2 — spring ramp-up
  3: 1.00,  // Q3 — steady baseline
  4: 1.25,  // Q4 — holiday peak
};

/**
 * Industry base CPM rates (USD) — these serve as fallback references
 * when historical data is insufficient.
 */
export const INDUSTRY_BASE_CPM: Record<string, number> = {
  technology: 12.50,
  finance: 15.00,
  beauty: 8.00,
  fashion: 9.50,
  food: 6.00,
  gaming: 5.50,
  fitness: 7.00,
  travel: 10.00,
  education: 8.50,
  entertainment: 7.50,
  default: 8.00,
};
