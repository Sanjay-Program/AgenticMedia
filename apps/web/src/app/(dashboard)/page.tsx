import { KPICard } from '@/components/kpi-card';

/**
 * Dashboard overview page — Server Component by default.
 * Displays high-level KPIs: Total GMV Processed, Active Deals, AI Tokens Consumed.
 *
 * In production, these values would be fetched from the API via apiFetch().
 * For now, we render with placeholder data that demonstrates the layout.
 */
export default function DashboardPage() {
  // In production: const data = await apiFetch('/api/dashboard/kpis');
  const kpis = {
    totalGMV: 12_450_000,
    activeDeals: 47,
    aiTokensConsumed: 2_340_000,
    creatorsManaged: 156,
    pendingPayouts: 890_000,
    agentRunsToday: 312,
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Command Center</h1>
        <p className="mt-1 text-sm text-gray-400">
          Real-time overview of your autonomous media operations
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <KPICard
          title="Total GMV Processed"
          value={`$${(kpis.totalGMV / 1_000_000).toFixed(1)}M`}
          subtitle="Lifetime gross merchandise value"
          icon="💎"
          trend={{ value: '12.3% this month', positive: true }}
        />
        <KPICard
          title="Active Deals"
          value={kpis.activeDeals.toString()}
          subtitle="Currently in negotiation or execution"
          icon="🤝"
          trend={{ value: '8 new this week', positive: true }}
        />
        <KPICard
          title="AI Tokens Consumed"
          value={`${(kpis.aiTokensConsumed / 1_000_000).toFixed(1)}M`}
          subtitle="LLM tokens used across all agents"
          icon="🧠"
        />
        <KPICard
          title="Creators Managed"
          value={kpis.creatorsManaged.toString()}
          subtitle="Active creator profiles"
          icon="🎬"
          trend={{ value: '23 added this month', positive: true }}
        />
        <KPICard
          title="Pending Payouts"
          value={`$${(kpis.pendingPayouts / 1_000).toFixed(0)}K`}
          subtitle="Awaiting Stripe processing"
          icon="💰"
        />
        <KPICard
          title="Agent Runs Today"
          value={kpis.agentRunsToday.toString()}
          subtitle="Scout, Negotiator, Legal agents"
          icon="🤖"
          trend={{ value: '15% vs yesterday', positive: true }}
        />
      </div>

      {/* Recent Activity */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
        <div className="mt-4 space-y-3">
          {[
            { time: '2m ago', agent: 'Negotiator', action: 'Counter-offer sent to Nike at $15,000 CPM', status: 'completed' },
            { time: '5m ago', agent: 'Scout', action: 'Discovered @viral_creator (2.3M followers, 8.4% engagement)', status: 'completed' },
            { time: '12m ago', agent: 'Legal', action: 'Contract generated for Adidas campaign #1847', status: 'completed' },
            { time: '18m ago', agent: 'Negotiator', action: 'Escalated Puma deal to human review', status: 'escalated' },
            { time: '25m ago', agent: 'Scout', action: 'Evaluated 47 creators on TikTok', status: 'completed' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border border-[#1e1e2e] bg-[#111118] px-4 py-3">
              <span className="text-xs text-gray-500 w-16">{item.time}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                item.agent === 'Negotiator' ? 'bg-blue-500/10 text-blue-400' :
                item.agent === 'Scout' ? 'bg-green-500/10 text-green-400' :
                'bg-purple-500/10 text-purple-400'
              }`}>
                {item.agent}
              </span>
              <span className="flex-1 text-sm text-gray-300">{item.action}</span>
              <span className={`text-xs ${
                item.status === 'completed' ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
