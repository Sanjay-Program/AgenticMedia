export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'linkedin' | 'twitter';

export interface Creator {
  id: string;
  organizationId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  primaryPlatform: Platform;
  stripeConnectedAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorPlatform {
  id: string;
  creatorId: string;
  platform: Platform;
  platformUserId: string;
  username: string;
  followersCount: number;
  engagementRate: number;
  avgViews: number;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
