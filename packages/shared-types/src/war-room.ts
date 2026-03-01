// Enterprise Command Center — Real-Time Agency War Room types

/** Live Revenue Ticker */
export interface RevenueTicker {
  organizationId: string;
  timestamp: string;
  gmv: number;
  platformFee: number;
  creatorRevenue: number;
  agencyShare: number;
  periodStart: string;
  periodEnd: string;
}

/** Risk Heatmap Entry */
export type RiskColor = 'green' | 'yellow' | 'orange' | 'red';

export interface RiskHeatmapEntry {
  creatorId: string;
  creatorName: string;
  riskScore: number; // 0-100
  color: RiskColor;
  primaryRisk: string;
  revenueAtRisk: number;
  lastUpdated: string;
}

/** Portfolio View for Agencies */
export interface PortfolioCreator {
  creatorId: string;
  name: string;
  platform: string;
  followers: number;
  engagementRate: number;
  ltv12Month: number;
  riskScore: number;
  activeCampaigns: number;
  totalRevenue: number;
  ranking: number;
  trend: 'up' | 'stable' | 'down';
}

export interface AgencyPortfolio {
  organizationId: string;
  creators: PortfolioCreator[];
  totalGMV: number;
  averageRiskScore: number;
  topPerformerId: string;
  underperformerIds: string[];
  generatedAt: string;
}

/** Brand ROI Dashboard */
export interface BrandROIMetrics {
  campaignId: string;
  brandName: string;
  totalSpend: number;
  engagementPerDollar: number;
  conversionRate: number;
  revenuePerPost: number;
  roas: number; // return on ad spend
  predictedROI: number;
  actualROI: number | null;
  reportDate: string;
}

/** War Room Snapshot (point-in-time dashboard state) */
export interface WarRoomSnapshot {
  id: string;
  organizationId: string;
  ticker: RevenueTicker;
  riskHeatmap: RiskHeatmapEntry[];
  portfolioSummary: {
    totalCreators: number;
    totalGMV: number;
    avgRisk: number;
    underperformers: number;
  };
  topAlerts: string[];
  capturedAt: string;
}

/** Classify risk color from score */
export function classifyRiskColor(score: number): RiskColor {
  if (score <= 25) return 'green';
  if (score <= 50) return 'yellow';
  if (score <= 75) return 'orange';
  return 'red';
}

/** Calculate portfolio health index (0-100) */
export function calculatePortfolioHealth(creators: PortfolioCreator[]): number {
  if (creators.length === 0) return 0;
  const avgRisk = creators.reduce((sum, c) => sum + c.riskScore, 0) / creators.length;
  const avgEngagement = creators.reduce((sum, c) => sum + c.engagementRate, 0) / creators.length;
  // Health = high engagement, low risk
  const riskHealth = Math.max(0, 100 - avgRisk);
  const engagementHealth = Math.min(avgEngagement * 1000, 100); // normalize (0.05 => 50)
  return Math.round((riskHealth * 0.6 + engagementHealth * 0.4) * 100) / 100;
}
