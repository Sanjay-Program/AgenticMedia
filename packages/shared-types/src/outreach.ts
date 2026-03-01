export type ContactSource = 'apollo' | 'zoominfo' | 'manual';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';
export type EmailStatus = 'queued' | 'sent' | 'delivered' | 'opened' | 'replied' | 'bounced';
export type Sentiment = 'positive' | 'neutral' | 'negative' | 'interested';

export interface BrandContact {
  id: string;
  organizationId: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactTitle: string | null;
  linkedinUrl: string | null;
  source: ContactSource;
  enrichmentData: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface OutreachCampaign {
  id: string;
  organizationId: string;
  creatorId: string;
  name: string;
  status: CampaignStatus;
  targetIndustry: string | null;
  budgetRangeMin: number | null;
  budgetRangeMax: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface OutreachEmail {
  id: string;
  campaignId: string;
  brandContactId: string;
  subject: string;
  bodyHtml: string;
  status: EmailStatus;
  sentAt: string | null;
  openedAt: string | null;
  repliedAt: string | null;
  llmModelUsed: string | null;
  createdAt: string;
}

export interface OutreachReply {
  id: string;
  emailId: string;
  rawBody: string;
  sentiment: Sentiment;
  aiSummary: string | null;
  suggestedAction: string | null;
  reviewedBy: string | null;
  createdAt: string;
}
