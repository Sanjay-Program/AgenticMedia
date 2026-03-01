// Social Media Connections & Integration Hub Types

export type SocialPlatform = 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'linkedin';
export type IntegrationProvider = 'hubspot' | 'gmail' | 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'linkedin' | 'slack' | 'google' | 'salesforce' | 'netsuite' | 'sap' | 'microsoft_teams';
export type IntegrationCategory = 'social' | 'crm' | 'email' | 'messaging' | 'enterprise';
export type ConnectionStatus = 'connected' | 'disconnected' | 'expired' | 'error';

export interface SocialConnection {
  id: string;
  organizationId: string;
  userId: string;
  platform: SocialPlatform;
  platformUserId: string | null;
  platformUsername: string | null;
  displayName: string | null;
  profileUrl: string | null;
  followersCount: number;
  status: ConnectionStatus;
  scopes: string[];
  lastSyncedAt: string | null;
  connectedAt: string;
}

export interface IntegrationConfig {
  provider: IntegrationProvider;
  category: IntegrationCategory;
  name: string;
  description: string;
  icon: string;
  scopes: string[];
  features: string[];
}

export interface AutomationWorkflow {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  isActive: boolean;
  lastRunAt: string | null;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

export type AutomationTriggerType =
  | 'social.metric.updated'
  | 'social.creator.discovered'
  | 'email.replied'
  | 'payment.succeeded'
  | 'contract.signed'
  | 'agent.run.completed'
  | 'schedule.cron';

export interface AutomationTrigger {
  type: AutomationTriggerType;
  config: Record<string, unknown>;
}

export type AutomationActionType =
  | 'sync.social.metrics'
  | 'send.email'
  | 'create.campaign'
  | 'notify.slack'
  | 'update.crm'
  | 'run.agent';

export interface AutomationAction {
  type: AutomationActionType;
  config: Record<string, unknown>;
}

/** Registry of all supported integrations with their metadata */
export const INTEGRATION_REGISTRY: IntegrationConfig[] = [
  {
    provider: 'youtube',
    category: 'social',
    name: 'YouTube',
    description: 'Connect YouTube channels for analytics, content tracking, and audience insights',
    icon: '📺',
    scopes: ['youtube.readonly', 'youtube.analytics'],
    features: ['Channel analytics', 'Video performance', 'Audience demographics', 'Revenue tracking'],
  },
  {
    provider: 'instagram',
    category: 'social',
    name: 'Instagram',
    description: 'Connect Instagram business accounts for engagement metrics and content analytics',
    icon: '📸',
    scopes: ['instagram.basic', 'instagram.insights'],
    features: ['Post analytics', 'Story metrics', 'Audience insights', 'Hashtag tracking'],
  },
  {
    provider: 'tiktok',
    category: 'social',
    name: 'TikTok',
    description: 'Connect TikTok creator accounts for video analytics and trend monitoring',
    icon: '🎵',
    scopes: ['tiktok.analytics', 'tiktok.content.read'],
    features: ['Video analytics', 'Trend tracking', 'Audience demographics', 'Sound analytics'],
  },
  {
    provider: 'twitter',
    category: 'social',
    name: 'Twitter / X',
    description: 'Connect Twitter/X accounts for engagement tracking and audience analysis',
    icon: '🐦',
    scopes: ['tweet.read', 'users.read', 'offline.access'],
    features: ['Tweet analytics', 'Engagement metrics', 'Follower growth', 'Mention tracking'],
  },
  {
    provider: 'linkedin',
    category: 'social',
    name: 'LinkedIn',
    description: 'Connect LinkedIn profiles for B2B creator analytics and professional reach',
    icon: '💼',
    scopes: ['r_liteprofile', 'r_organization_social'],
    features: ['Post analytics', 'Profile views', 'Company page metrics', 'B2B reach'],
  },
  {
    provider: 'hubspot',
    category: 'crm',
    name: 'HubSpot',
    description: 'Sync brand contacts and deal pipeline with your HubSpot CRM',
    icon: '🧲',
    scopes: ['contacts', 'crm.objects.contacts.read'],
    features: ['Contact sync', 'Deal pipeline', 'Company records', 'Activity logging'],
  },
  {
    provider: 'gmail',
    category: 'email',
    name: 'Gmail',
    description: 'Let AI agents send emails directly from your real inbox',
    icon: '📧',
    scopes: ['gmail.send', 'gmail.readonly'],
    features: ['AI email sending', 'Reply tracking', 'Thread management', 'Template sync'],
  },
  {
    provider: 'slack',
    category: 'messaging',
    name: 'Slack',
    description: 'Get real-time notifications and AI agent updates in your Slack workspace',
    icon: '💬',
    scopes: ['chat:write', 'channels:read'],
    features: ['Deal notifications', 'Agent alerts', 'Team updates', 'Command integration'],
  },
  {
    provider: 'salesforce',
    category: 'enterprise',
    name: 'Salesforce',
    description: 'Sync campaigns, contacts, and revenue data bi-directionally with Salesforce CRM',
    icon: '☁️',
    scopes: ['api', 'refresh_token', 'full'],
    features: ['Contact sync', 'Opportunity pipeline', 'Revenue reporting', 'Custom objects'],
  },
  {
    provider: 'netsuite',
    category: 'enterprise',
    name: 'NetSuite',
    description: 'Export financial transactions, invoices, and accounting data to Oracle NetSuite',
    icon: '📊',
    scopes: ['restlets', 'rest_webservices'],
    features: ['Invoice export', 'Revenue recognition', 'GL entries', 'Vendor sync'],
  },
  {
    provider: 'sap',
    category: 'enterprise',
    name: 'SAP',
    description: 'Enterprise-grade integration with SAP ERP for financial and operational data',
    icon: '🏢',
    scopes: ['sap.financial', 'sap.api'],
    features: ['Financial posting', 'Vendor management', 'Purchase orders', 'Cost centers'],
  },
  {
    provider: 'microsoft_teams',
    category: 'messaging',
    name: 'Microsoft Teams',
    description: 'Receive deal alerts, agent notifications, and collaborate directly in MS Teams',
    icon: '👥',
    scopes: ['ChannelMessage.Send', 'Chat.ReadWrite'],
    features: ['Deal notifications', 'Agent alerts', 'Channel posting', 'Bot integration'],
  },
];
