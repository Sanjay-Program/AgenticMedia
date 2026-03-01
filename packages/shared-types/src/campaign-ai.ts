// Enterprise V2: AI Campaign Manager Types

export interface CampaignBrief {
  campaignId: string;
  creatorId: string;
  brandName: string;
  objective: string;
  targetAudience: string;
  deliverables: CampaignDeliverable[];
  timeline: { startDate: string; endDate: string };
  budget: number;
  kpis: CampaignKPI[];
  generatedAt: string;
}

export interface CampaignDeliverable {
  type: 'video' | 'post' | 'story' | 'reel' | 'short' | 'blog';
  platform: string;
  quantity: number;
  description: string;
  dueDate: string;
}

export interface CampaignKPI {
  metric: string;
  target: number;
  unit: string;
}

export interface CampaignReport {
  campaignId: string;
  organizationId: string;
  period: { startDate: string; endDate: string };
  summary: string;
  performance: CampaignPerformanceMetrics;
  recommendations: string[];
  generatedAt: string;
}

export interface CampaignPerformanceMetrics {
  totalImpressions: number;
  totalEngagements: number;
  engagementRate: number;
  estimatedReach: number;
  costPerEngagement: number;
  roi: number;
  deliverableCompletion: number; // percentage
}

export interface CampaignOptimization {
  campaignId: string;
  currentPerformance: CampaignPerformanceMetrics;
  suggestions: OptimizationSuggestion[];
  projectedImprovement: number; // percentage improvement if suggestions applied
  generatedAt: string;
}

export interface OptimizationSuggestion {
  type: 'timing' | 'content' | 'audience' | 'budget' | 'platform';
  priority: 'low' | 'medium' | 'high';
  description: string;
  expectedImpact: number; // percentage improvement
}
