import { UserRole } from './auth';

export interface User {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  brandingConfig: BrandingConfig | null;
  stripeAccountId: string | null;
  planTier: PlanTier;
  createdAt: string;
  updatedAt: string;
}

export interface BrandingConfig {
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  faviconUrl?: string;
}

export type PlanTier = 'starter' | 'growth' | 'enterprise';
