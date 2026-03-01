// Module 4: Agency Command Center - White Label Branding Types

export interface WhiteLabelBranding {
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  companyName: string;
  customDomain: string | null;
}

export const DEFAULT_BRANDING: WhiteLabelBranding = {
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#6366F1',
  accentColor: '#8B5CF6',
  backgroundColor: '#0F172A',
  textColor: '#F8FAFC',
  fontFamily: 'Inter, system-ui, sans-serif',
  companyName: 'AgenticMedia',
  customDomain: null,
};

/** Validates a hex color string */
export function isValidHexColor(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

export interface UpdateBrandingInput {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  companyName?: string;
}

export interface LiveRevenueEvent {
  organizationId: string;
  creatorId: string;
  creatorName: string;
  campaignId: string;
  campaignName: string;
  amount: number;
  currency: string;
  timestamp: string;
}
