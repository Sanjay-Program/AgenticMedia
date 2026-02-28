export interface DiscoveryMetric {
  id: string;
  creatorPlatformId: string;
  snapshotDate: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  avgLikes: number;
  avgComments: number;
  avgViews: number;
  engagementRate: number;
  growthVelocity: number;
  aiScore: number;
  demographics: Demographics | null;
  brandAffinity: string[] | null;
  predictedRoi: number | null;
  createdAt: string;
}

export interface Demographics {
  ageGroups?: Record<string, number>;
  genderSplit?: Record<string, number>;
  topCountries?: Record<string, number>;
  topCities?: Record<string, number>;
}

export interface DiscoveryFilter {
  platform?: string;
  minFollowers?: number;
  maxFollowers?: number;
  minEngagementRate?: number;
  minAiScore?: number;
  industry?: string;
  country?: string;
  sortBy?: 'ai_score' | 'growth_velocity' | 'engagement_rate' | 'followers_count';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
