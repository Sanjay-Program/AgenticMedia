import { Suspense } from 'react';
import { SkeletonCard } from '@/components/skeleton-loader';

/**
 * Integrations Hub — Server Component.
 * Shows all available integrations grouped by category: Social Media, CRM, Email, Messaging.
 * Users can connect/disconnect platforms from this central hub.
 *
 * In production, data is fetched from:
 * - /api/integrations/registry (available integrations)
 * - /api/integrations (connected integrations for current user)
 */

const integrations = [
  // Social Media
  {
    provider: 'youtube',
    category: 'social',
    name: 'YouTube',
    description: 'Connect YouTube channels for analytics, content tracking, and audience insights',
    icon: '📺',
    features: ['Channel analytics', 'Video performance', 'Audience demographics', 'Revenue tracking'],
    connected: true,
    accountName: '@creative_studio',
    followers: '2.3M',
  },
  {
    provider: 'instagram',
    category: 'social',
    name: 'Instagram',
    description: 'Connect Instagram business accounts for engagement metrics and content analytics',
    icon: '📸',
    features: ['Post analytics', 'Story metrics', 'Audience insights', 'Hashtag tracking'],
    connected: true,
    accountName: '@creative_studio',
    followers: '890K',
  },
  {
    provider: 'tiktok',
    category: 'social',
    name: 'TikTok',
    description: 'Connect TikTok creator accounts for video analytics and trend monitoring',
    icon: '🎵',
    features: ['Video analytics', 'Trend tracking', 'Audience demographics', 'Sound analytics'],
    connected: false,
    accountName: null,
    followers: null,
  },
  {
    provider: 'twitter',
    category: 'social',
    name: 'Twitter / X',
    description: 'Connect Twitter/X accounts for engagement tracking and audience analysis',
    icon: '🐦',
    features: ['Tweet analytics', 'Engagement metrics', 'Follower growth', 'Mention tracking'],
    connected: true,
    accountName: '@creativestudio',
    followers: '156K',
  },
  {
    provider: 'linkedin',
    category: 'social',
    name: 'LinkedIn',
    description: 'Connect LinkedIn profiles for B2B creator analytics and professional reach',
    icon: '💼',
    features: ['Post analytics', 'Profile views', 'Company page metrics', 'B2B reach'],
    connected: false,
    accountName: null,
    followers: null,
  },
  // CRM
  {
    provider: 'hubspot',
    category: 'crm',
    name: 'HubSpot',
    description: 'Sync brand contacts and deal pipeline with your HubSpot CRM',
    icon: '🧲',
    features: ['Contact sync', 'Deal pipeline', 'Company records', 'Activity logging'],
    connected: true,
    accountName: 'Agency Hub',
    followers: null,
  },
  // Email
  {
    provider: 'gmail',
    category: 'email',
    name: 'Gmail',
    description: 'Let AI agents send emails directly from your real inbox',
    icon: '📧',
    features: ['AI email sending', 'Reply tracking', 'Thread management', 'Template sync'],
    connected: true,
    accountName: 'team@agency.com',
    followers: null,
  },
  // Messaging
  {
    provider: 'slack',
    category: 'messaging',
    name: 'Slack',
    description: 'Get real-time notifications and AI agent updates in your Slack workspace',
    icon: '💬',
    features: ['Deal notifications', 'Agent alerts', 'Team updates', 'Command integration'],
    connected: false,
    accountName: null,
    followers: null,
  },
];

const categories = [
  { key: 'social', label: 'Social Media', icon: '📱', description: 'Connect social media accounts to track creator analytics and content performance' },
  { key: 'crm', label: 'CRM & Sales', icon: '🧲', description: 'Sync brand contacts and deal pipelines with your sales tools' },
  { key: 'email', label: 'Email', icon: '📧', description: 'Let AI agents send and track emails from your real inbox' },
  { key: 'messaging', label: 'Messaging', icon: '💬', description: 'Get real-time notifications in your team communication tools' },
];

export default function IntegrationsPage() {
  const connectedCount = integrations.filter(i => i.connected).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Integration Hub</h1>
        <p className="mt-1 text-sm text-gray-400">
          Connect your social media, CRM, email, and messaging tools to automate your entire workflow
        </p>
        <div className="mt-4 flex items-center gap-4">
          <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
            {connectedCount} connected
          </span>
          <span className="rounded-full bg-[#1e1e2e] px-3 py-1 text-xs font-medium text-gray-400">
            {integrations.length - connectedCount} available
          </span>
        </div>
      </div>

      {/* Integration Categories */}
      {categories.map((cat) => {
        const catIntegrations = integrations.filter(i => i.category === cat.key);
        if (catIntegrations.length === 0) return null;

        return (
          <div key={cat.key} className="mb-10">
            <div className="mb-4 flex items-center gap-3">
              <span className="text-xl">{cat.icon}</span>
              <div>
                <h2 className="text-lg font-semibold text-white">{cat.label}</h2>
                <p className="text-sm text-gray-400">{cat.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {catIntegrations.map((integration) => (
                <Suspense key={integration.provider} fallback={<SkeletonCard />}>
                  <div className={`rounded-xl border p-6 transition-all ${
                    integration.connected
                      ? 'border-green-500/20 bg-[#111118]'
                      : 'border-[#1e1e2e] bg-[#111118] hover:border-indigo-500/30'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{integration.icon}</span>
                        <div>
                          <h3 className="text-base font-semibold text-white">{integration.name}</h3>
                          {integration.connected && integration.accountName && (
                            <p className="text-xs text-gray-400">{integration.accountName}</p>
                          )}
                        </div>
                      </div>
                      {integration.connected ? (
                        <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                          Connected
                        </span>
                      ) : (
                        <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500">
                          Connect
                        </button>
                      )}
                    </div>
                    <p className="mt-3 text-sm text-gray-400">{integration.description}</p>
                    {integration.connected && integration.followers && (
                      <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#0d0d14] px-3 py-2">
                        <span className="text-xs text-gray-500">Followers:</span>
                        <span className="text-sm font-semibold text-white">{integration.followers}</span>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {integration.features.map((feature) => (
                        <span key={feature} className="rounded bg-[#1e1e2e] px-2 py-0.5 text-xs text-gray-400">
                          {feature}
                        </span>
                      ))}
                    </div>
                    {integration.connected && (
                      <div className="mt-4 flex gap-2">
                        <button className="flex-1 rounded-lg border border-[#1e1e2e] px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:border-indigo-500/30 hover:text-white">
                          Sync Now
                        </button>
                        <button className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:border-red-500/40 hover:bg-red-500/5">
                          Disconnect
                        </button>
                      </div>
                    )}
                  </div>
                </Suspense>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
