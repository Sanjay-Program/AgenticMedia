import { Suspense } from 'react';
import { SkeletonCard } from '@/components/skeleton-loader';

/**
 * Social Media Connections — Server Component.
 * Shows connected social media accounts with live metrics, sync status,
 * and platform-specific analytics.
 *
 * In production, data is fetched from:
 * - /api/integrations/social (connected social accounts)
 * - Creator platform analytics from the database
 */

const socialAccounts = [
  {
    platform: 'youtube',
    name: 'YouTube',
    icon: '📺',
    color: 'red',
    connected: true,
    username: '@creative_studio',
    displayName: 'Creative Studio Official',
    profileUrl: 'https://youtube.com/@creative_studio',
    followers: 2_340_000,
    metrics: {
      subscribers: '2.34M',
      totalViews: '156M',
      avgViewsPerVideo: '1.2M',
      engagementRate: '8.4%',
      uploadFrequency: '3/week',
      estimatedRevenue: '$12.4K/mo',
    },
    recentContent: [
      { title: 'Nike Campaign Behind the Scenes', views: '2.1M', date: '2 days ago' },
      { title: 'How I Negotiate Brand Deals', views: '1.8M', date: '5 days ago' },
      { title: 'Creator Economy 2026 Predictions', views: '890K', date: '1 week ago' },
    ],
    lastSynced: '2 min ago',
  },
  {
    platform: 'instagram',
    name: 'Instagram',
    icon: '📸',
    color: 'pink',
    connected: true,
    username: '@creative_studio',
    displayName: 'Creative Studio',
    profileUrl: 'https://instagram.com/creative_studio',
    followers: 890_000,
    metrics: {
      followers: '890K',
      following: '1,234',
      posts: '2,847',
      engagementRate: '5.2%',
      avgLikes: '45.2K',
      storyViews: '125K avg',
    },
    recentContent: [
      { title: 'Nike collection reveal', views: '234K likes', date: '1 day ago' },
      { title: 'Studio tour vlog', views: '178K likes', date: '3 days ago' },
      { title: 'Brand deal tips carousel', views: '156K likes', date: '5 days ago' },
    ],
    lastSynced: '5 min ago',
  },
  {
    platform: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    color: 'cyan',
    connected: false,
    username: null,
    displayName: null,
    profileUrl: null,
    followers: 0,
    metrics: null,
    recentContent: [],
    lastSynced: null,
  },
  {
    platform: 'twitter',
    name: 'Twitter / X',
    icon: '🐦',
    color: 'blue',
    connected: true,
    username: '@creativestudio',
    displayName: 'Creative Studio',
    profileUrl: 'https://twitter.com/creativestudio',
    followers: 156_000,
    metrics: {
      followers: '156K',
      following: '892',
      tweets: '12.4K',
      engagementRate: '3.8%',
      avgImpressions: '45K/tweet',
      mentionsPerDay: '23 avg',
    },
    recentContent: [
      { title: 'Thread: Creator monetization tips', views: '89K impressions', date: '4 hours ago' },
      { title: 'Nike collab announcement', views: '234K impressions', date: '1 day ago' },
    ],
    lastSynced: '1 min ago',
  },
  {
    platform: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    color: 'blue',
    connected: false,
    username: null,
    displayName: null,
    profileUrl: null,
    followers: 0,
    metrics: null,
    recentContent: [],
    lastSynced: null,
  },
];

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return count.toString();
}

export default function SocialConnectionsPage() {
  const connectedAccounts = socialAccounts.filter(a => a.connected);
  const totalFollowers = connectedAccounts.reduce((sum, a) => sum + a.followers, 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Social Media Connections</h1>
        <p className="mt-1 text-sm text-gray-400">
          Manage your connected social media accounts and track cross-platform analytics
        </p>
      </div>

      {/* Cross-Platform Summary */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
          <p className="text-xs text-gray-500">Connected Platforms</p>
          <p className="mt-1 text-2xl font-bold text-white">{connectedAccounts.length}/{socialAccounts.length}</p>
        </div>
        <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
          <p className="text-xs text-gray-500">Total Audience</p>
          <p className="mt-1 text-2xl font-bold text-indigo-400">{formatFollowers(totalFollowers)}</p>
        </div>
        <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
          <p className="text-xs text-gray-500">Avg. Engagement</p>
          <p className="mt-1 text-2xl font-bold text-green-400">5.8%</p>
        </div>
        <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
          <p className="text-xs text-gray-500">Content This Week</p>
          <p className="mt-1 text-2xl font-bold text-white">14</p>
        </div>
      </div>

      {/* Platform Cards */}
      <div className="space-y-6">
        {socialAccounts.map((account) => (
          <Suspense key={account.platform} fallback={<SkeletonCard />}>
            <div className={`rounded-xl border p-6 ${
              account.connected
                ? 'border-[#1e1e2e] bg-[#111118]'
                : 'border-dashed border-[#1e1e2e] bg-[#0d0d14]'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{account.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{account.name}</h3>
                    {account.connected ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">{account.username}</span>
                        <span className="text-gray-600">•</span>
                        <span className="text-sm font-medium text-white">{formatFollowers(account.followers)} followers</span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Not connected</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {account.connected ? (
                    <>
                      <span className="text-xs text-gray-500">Synced {account.lastSynced}</span>
                      <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                        Live
                      </span>
                    </>
                  ) : (
                    <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500">
                      Connect {account.name}
                    </button>
                  )}
                </div>
              </div>

              {account.connected && account.metrics && (
                <>
                  {/* Metrics Grid */}
                  <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    {Object.entries(account.metrics).map(([key, value]) => (
                      <div key={key} className="rounded-lg bg-[#0d0d14] px-3 py-2.5">
                        <p className="text-xs text-gray-500">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-white">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Recent Content */}
                  {account.recentContent.length > 0 && (
                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-medium text-gray-400">Recent Content</h4>
                      <div className="space-y-2">
                        {account.recentContent.map((content, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg border border-[#1e1e2e] px-4 py-2.5">
                            <span className="text-sm text-gray-300">{content.title}</span>
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-medium text-indigo-400">{content.views}</span>
                              <span className="text-xs text-gray-500">{content.date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex gap-3">
                    <button className="rounded-lg border border-[#1e1e2e] px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:border-indigo-500/30 hover:text-white">
                      🔄 Sync Now
                    </button>
                    <button className="rounded-lg border border-[#1e1e2e] px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:border-indigo-500/30 hover:text-white">
                      📊 Full Analytics
                    </button>
                    <button className="rounded-lg border border-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:border-red-500/40 hover:bg-red-500/5">
                      Disconnect
                    </button>
                  </div>
                </>
              )}
            </div>
          </Suspense>
        ))}
      </div>
    </div>
  );
}
