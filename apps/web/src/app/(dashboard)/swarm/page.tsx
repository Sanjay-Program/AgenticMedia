/**
 * AI Swarm monitoring page — Server Component.
 * Shows real-time status of Scout, Negotiator, and Legal agents.
 * Uses LiveAgentFeed (Client Component) for WebSocket-powered real-time events.
 *
 * In production, this would fetch from:
 * - /api/agent-runs (agent_runs table)
 * - /api/events (event_log table)
 */

import { LiveAgentFeed } from '@/components/live-agent-feed';

export default function SwarmPage() {
  // In production: const runs = await apiFetch('/api/agent-runs?limit=20');
  const agents = [
    {
      name: 'Scout Agent',
      type: 'scout' as const,
      status: 'active',
      description: 'Discovers viral creators and evaluates brand-fit scores',
      stats: { runsToday: 89, successRate: '97.8%', avgLatency: '1.2s' },
    },
    {
      name: 'Negotiator Agent',
      type: 'negotiator' as const,
      status: 'active',
      description: 'Reads inbound emails and generates counter-offers using historical CPM data',
      stats: { runsToday: 156, successRate: '94.2%', avgLatency: '3.4s' },
    },
    {
      name: 'Legal Agent',
      type: 'legal' as const,
      status: 'active',
      description: 'Auto-generates DocuSign contracts when deals are reached',
      stats: { runsToday: 23, successRate: '100%', avgLatency: '5.1s' },
    },
    {
      name: 'Orchestrator',
      type: 'orchestrator' as const,
      status: 'active',
      description: 'Routes events to the correct agent and manages the swarm lifecycle',
      stats: { runsToday: 268, successRate: '99.6%', avgLatency: '0.1s' },
    },
  ];

  const recentRuns = [
    { id: 'run-001', agent: 'negotiator', status: 'completed', input: 'Nike email re: YouTube campaign', tokens: 1247, duration: '3.2s', time: '1m ago' },
    { id: 'run-002', agent: 'scout', status: 'completed', input: 'TikTok creator scan: fitness niche', tokens: 856, duration: '1.1s', time: '2m ago' },
    { id: 'run-003', agent: 'negotiator', status: 'completed', input: 'Adidas counter-offer response', tokens: 1534, duration: '4.1s', time: '5m ago' },
    { id: 'run-004', agent: 'legal', status: 'completed', input: 'Generate contract: Campaign #1847', tokens: 2103, duration: '5.3s', time: '8m ago' },
    { id: 'run-005', agent: 'negotiator', status: 'failed', input: 'Puma email parse error', tokens: 423, duration: '1.0s', time: '12m ago' },
    { id: 'run-006', agent: 'scout', status: 'completed', input: 'Instagram creator scan: beauty', tokens: 912, duration: '1.4s', time: '15m ago' },
    { id: 'run-007', agent: 'negotiator', status: 'completed', input: 'Red Bull sponsorship counter', tokens: 1678, duration: '3.8s', time: '18m ago' },
    { id: 'run-008', agent: 'orchestrator', status: 'completed', input: 'Route email.replied event', tokens: 0, duration: '0.05s', time: '18m ago' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">AI Agent Swarm</h1>
        <p className="mt-1 text-sm text-gray-400">
          Monitor your autonomous AI agents in real-time
        </p>
      </div>

      {/* Agent Status Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {agents.map((agent) => (
          <div
            key={agent.type}
            className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
                <p className="mt-1 text-sm text-gray-400">{agent.description}</p>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400"></span>
                {agent.status}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500">Runs Today</p>
                <p className="mt-1 text-lg font-semibold text-white">{agent.stats.runsToday}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Success Rate</p>
                <p className="mt-1 text-lg font-semibold text-green-400">{agent.stats.successRate}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Avg Latency</p>
                <p className="mt-1 text-lg font-semibold text-white">{agent.stats.avgLatency}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Agent Runs */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-white">Recent Agent Runs</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-[#1e1e2e]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#1e1e2e] bg-[#111118]">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Agent</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Input</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Tokens</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Duration</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e2e] bg-[#0d0d14]">
              {recentRuns.map((run) => (
                <tr key={run.id} className="hover:bg-[#111118]">
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      run.agent === 'negotiator' ? 'bg-blue-500/10 text-blue-400' :
                      run.agent === 'scout' ? 'bg-green-500/10 text-green-400' :
                      run.agent === 'legal' ? 'bg-purple-500/10 text-purple-400' :
                      'bg-gray-500/10 text-gray-400'
                    }`}>
                      {run.agent}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{run.input}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${
                      run.status === 'completed' ? 'text-green-400' :
                      run.status === 'failed' ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{run.tokens.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-400">{run.duration}</td>
                  <td className="px-4 py-3 text-gray-500">{run.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Event Stream (WebSocket-powered) */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-white">Live Event Stream</h2>
        <p className="mt-1 text-sm text-gray-400">Real-time events from the event bus via WebSocket</p>
        <div className="mt-4">
          <LiveAgentFeed />
        </div>
      </div>
    </div>
  );
}
