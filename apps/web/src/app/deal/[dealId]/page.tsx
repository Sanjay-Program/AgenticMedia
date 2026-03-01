import { Suspense } from 'react';
import { SkeletonCard, SkeletonTable } from '@/components/skeleton-loader';

/**
 * Deal Room — Server Component.
 * A premium, white-labeled interface where Brands and Creators interact securely.
 * Shows contract details, creator analytics, and payment controls.
 *
 * In production, data is fetched via API calls using the dealId param.
 */
export default async function DealRoomPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId } = await params;

  // In production: const deal = await apiFetch(`/api/fintech/campaigns/${dealId}`);
  const deal = {
    id: dealId,
    name: 'YouTube Integration Campaign — Nike',
    brand: 'Nike',
    creator: '@creative_studio',
    creatorFollowers: '2.3M',
    creatorEngagement: '8.4%',
    status: 'active' as const,
    totalValue: 15000,
    platformFee: 300,
    agencyFee: 2250,
    creatorPayout: 12450,
    currency: 'USD',
    startDate: '2026-03-01',
    endDate: '2026-04-01',
    contractTerms: {
      deliverables: ['1x YouTube video (min 10 min)', '3x Instagram Stories', '1x TikTok'],
      exclusivity: '30 days',
      revisionRounds: 2,
      usageRights: '12 months',
    },
  };

  const analytics = {
    avgViews: '1.2M',
    engagementRate: '8.4%',
    completionRate: '67%',
    demographics: { '18-24': '42%', '25-34': '31%', '35-44': '18%', '45+': '9%' },
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Top Bar */}
      <header className="border-b border-[#1e1e2e] bg-[#111118]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              A
            </div>
            <span className="text-lg font-semibold text-white">Deal Room</span>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
            deal.status === 'active' ? 'bg-green-500/10 text-green-400' :
            deal.status === 'completed' ? 'bg-blue-500/10 text-blue-400' :
            'bg-yellow-500/10 text-yellow-400'
          }`}>
            {deal.status.toUpperCase()}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Deal Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">{deal.name}</h1>
          <p className="mt-1 text-sm text-gray-400">
            {deal.brand} × {deal.creator} • Deal #{deal.id.slice(0, 8)}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column — Contract & Payment */}
          <div className="lg:col-span-2 space-y-6">
            {/* Financial Summary */}
            <Suspense fallback={<SkeletonCard />}>
              <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-6">
                <h2 className="text-lg font-semibold text-white">Financial Summary</h2>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-gray-500">Total Value</p>
                    <p className="mt-1 text-xl font-bold text-white">
                      ${deal.totalValue.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Platform Fee (2%)</p>
                    <p className="mt-1 text-xl font-semibold text-indigo-400">
                      ${deal.platformFee.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Agency (15%)</p>
                    <p className="mt-1 text-xl font-semibold text-blue-400">
                      ${deal.agencyFee.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Creator (83%)</p>
                    <p className="mt-1 text-xl font-semibold text-green-400">
                      ${deal.creatorPayout.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </Suspense>

            {/* Contract Terms */}
            <Suspense fallback={<SkeletonCard />}>
              <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-6">
                <h2 className="text-lg font-semibold text-white">Contract Terms</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">Deliverables</h3>
                    <ul className="mt-2 space-y-1">
                      {deal.contractTerms.deliverables.map((d, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                          <span className="text-green-400">✓</span>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-t border-[#1e1e2e] pt-4">
                    <div>
                      <p className="text-xs text-gray-500">Exclusivity</p>
                      <p className="mt-1 text-sm text-white">{deal.contractTerms.exclusivity}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Revision Rounds</p>
                      <p className="mt-1 text-sm text-white">{deal.contractTerms.revisionRounds}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Usage Rights</p>
                      <p className="mt-1 text-sm text-white">{deal.contractTerms.usageRights}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t border-[#1e1e2e] pt-4">
                    <div>
                      <p className="text-xs text-gray-500">Start Date</p>
                      <p className="mt-1 text-sm text-white">{deal.startDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">End Date</p>
                      <p className="mt-1 text-sm text-white">{deal.endDate}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Suspense>

            {/* Pay & Escrow Button */}
            <div className="rounded-xl border border-indigo-600/30 bg-indigo-600/5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">Ready to Proceed?</h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Funds will be held in escrow until deliverables are approved
                  </p>
                </div>
                <button className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/30">
                  Pay & Escrow ${deal.totalValue.toLocaleString()}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column — Creator Analytics */}
          <div className="space-y-6">
            <Suspense fallback={<SkeletonCard />}>
              <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-6">
                <h2 className="text-lg font-semibold text-white">Creator Profile</h2>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600/20 text-xl text-indigo-400">
                    🎬
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">{deal.creator}</p>
                    <p className="text-sm text-gray-400">{deal.creatorFollowers} followers</p>
                  </div>
                </div>
              </div>
            </Suspense>

            <Suspense fallback={<SkeletonCard />}>
              <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-6">
                <h2 className="text-lg font-semibold text-white">Live Analytics</h2>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Avg. Views</span>
                    <span className="text-sm font-semibold text-white">{analytics.avgViews}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Engagement Rate</span>
                    <span className="text-sm font-semibold text-green-400">{analytics.engagementRate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Completion Rate</span>
                    <span className="text-sm font-semibold text-white">{analytics.completionRate}</span>
                  </div>
                </div>
              </div>
            </Suspense>

            <Suspense fallback={<SkeletonCard />}>
              <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-6">
                <h2 className="text-lg font-semibold text-white">Audience Demographics</h2>
                <div className="mt-4 space-y-3">
                  {Object.entries(analytics.demographics).map(([age, pct]) => (
                    <div key={age}>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">{age}</span>
                        <span className="text-white">{pct}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-[#1e1e2e]">
                        <div
                          className="h-1.5 rounded-full bg-indigo-500"
                          style={{ width: pct }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
