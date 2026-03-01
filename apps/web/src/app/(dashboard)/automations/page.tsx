import { Suspense } from 'react';
import { SkeletonCard } from '@/components/skeleton-loader';

/**
 * Automations — Server Component.
 * Shows automated workflows that connect social media, CRM, email, and AI agents.
 * Users can enable/disable workflows and see run history.
 *
 * In production, data is fetched from:
 * - /api/automations (automation_workflows table)
 * - /api/integrations (connected integrations)
 */

const workflows = [
  {
    id: 'wf-001',
    name: 'YouTube Analytics Auto-Sync',
    description: 'Automatically sync YouTube channel analytics every 6 hours for all managed creators',
    trigger: { type: 'schedule.cron', label: 'Every 6 hours' },
    actions: ['Fetch YouTube metrics', 'Update creator_platforms table', 'Calculate engagement scores'],
    integrations: ['youtube'],
    isActive: true,
    lastRunAt: '2 min ago',
    runCount: 847,
    successRate: '99.8%',
    icon: '📺',
  },
  {
    id: 'wf-002',
    name: 'Instagram Story Performance Tracker',
    description: 'Track Instagram story views and engagement within 24-hour windows for campaign reporting',
    trigger: { type: 'schedule.cron', label: 'Every hour' },
    actions: ['Fetch story insights', 'Record time-series data', 'Generate performance report'],
    integrations: ['instagram'],
    isActive: true,
    lastRunAt: '45 min ago',
    runCount: 2_341,
    successRate: '98.7%',
    icon: '📸',
  },
  {
    id: 'wf-003',
    name: 'New Creator Auto-Discovery',
    description: 'AI Scout agent discovers viral creators on TikTok and Instagram matching brand criteria',
    trigger: { type: 'schedule.cron', label: 'Every 12 hours' },
    actions: ['Scan trending creators', 'Evaluate brand-fit score', 'Add to CRM pipeline'],
    integrations: ['tiktok', 'instagram', 'hubspot'],
    isActive: true,
    lastRunAt: '4 hours ago',
    runCount: 156,
    successRate: '97.8%',
    icon: '🔍',
  },
  {
    id: 'wf-004',
    name: 'Deal Notification Pipeline',
    description: 'Send Slack notifications when deals move stages, payments complete, or contracts are signed',
    trigger: { type: 'event', label: 'On deal events' },
    actions: ['Format notification', 'Post to #deals channel', 'Update HubSpot deal stage'],
    integrations: ['slack', 'hubspot'],
    isActive: true,
    lastRunAt: '15 min ago',
    runCount: 1_523,
    successRate: '100%',
    icon: '🔔',
  },
  {
    id: 'wf-005',
    name: 'AI Email Reply Handler',
    description: 'When a brand replies to an outreach email, AI Negotiator generates a counter-offer automatically',
    trigger: { type: 'event', label: 'On email.replied' },
    actions: ['Parse email sentiment', 'Generate counter-offer', 'Queue response draft', 'Log to CRM'],
    integrations: ['gmail', 'hubspot'],
    isActive: true,
    lastRunAt: '8 min ago',
    runCount: 423,
    successRate: '94.2%',
    icon: '🤖',
  },
  {
    id: 'wf-006',
    name: 'Cross-Platform Content Sync',
    description: 'When a creator posts on YouTube, automatically track mentions and shares across Instagram and Twitter',
    trigger: { type: 'event', label: 'On new YouTube upload' },
    actions: ['Detect new upload', 'Monitor Instagram mentions', 'Track Twitter shares', 'Aggregate metrics'],
    integrations: ['youtube', 'instagram', 'twitter'],
    isActive: false,
    lastRunAt: '3 days ago',
    runCount: 67,
    successRate: '95.5%',
    icon: '🔄',
  },
  {
    id: 'wf-007',
    name: 'Payment Split Auto-Ledger',
    description: 'When a brand payment succeeds via Stripe, automatically execute the 2/15/83 revenue split and record in ledger',
    trigger: { type: 'event', label: 'On payment.succeeded' },
    actions: ['Execute split payment', 'Create ledger entries', 'Notify agency', 'Update deal status'],
    integrations: ['stripe'],
    isActive: true,
    lastRunAt: '1 hour ago',
    runCount: 89,
    successRate: '100%',
    icon: '💰',
  },
  {
    id: 'wf-008',
    name: 'Weekly Performance Report',
    description: 'Aggregate cross-platform analytics and generate a comprehensive weekly report for agency managers',
    trigger: { type: 'schedule.cron', label: 'Every Monday 9 AM' },
    actions: ['Aggregate YouTube/Instagram/TikTok/Twitter metrics', 'Calculate ROI per creator', 'Generate PDF report', 'Email to managers'],
    integrations: ['youtube', 'instagram', 'tiktok', 'twitter', 'gmail'],
    isActive: true,
    lastRunAt: '3 days ago',
    runCount: 24,
    successRate: '100%',
    icon: '📊',
  },
];

const platformIcons: Record<string, string> = {
  youtube: '📺',
  instagram: '📸',
  tiktok: '🎵',
  twitter: '🐦',
  linkedin: '💼',
  hubspot: '🧲',
  gmail: '📧',
  slack: '💬',
  stripe: '💳',
};

export default function AutomationsPage() {
  const activeCount = workflows.filter(w => w.isActive).length;
  const totalRuns = workflows.reduce((sum, w) => sum + w.runCount, 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Automation Workflows</h1>
        <p className="mt-1 text-sm text-gray-400">
          Automated workflows connecting your social media, CRM, email, and AI agents
        </p>
      </div>

      {/* Summary Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
          <p className="text-xs text-gray-500">Active Workflows</p>
          <p className="mt-1 text-2xl font-bold text-green-400">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
          <p className="text-xs text-gray-500">Total Executions</p>
          <p className="mt-1 text-2xl font-bold text-white">{totalRuns.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
          <p className="text-xs text-gray-500">Avg. Success Rate</p>
          <p className="mt-1 text-2xl font-bold text-indigo-400">98.3%</p>
        </div>
        <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
          <p className="text-xs text-gray-500">Time Saved This Week</p>
          <p className="mt-1 text-2xl font-bold text-white">47 hrs</p>
        </div>
      </div>

      {/* Workflow Cards */}
      <div className="space-y-4">
        {workflows.map((workflow) => (
          <Suspense key={workflow.id} fallback={<SkeletonCard />}>
            <div className={`rounded-xl border p-6 transition-all ${
              workflow.isActive
                ? 'border-[#1e1e2e] bg-[#111118]'
                : 'border-dashed border-[#1e1e2e] bg-[#0d0d14] opacity-60'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 text-2xl">{workflow.icon}</span>
                  <div>
                    <h3 className="text-base font-semibold text-white">{workflow.name}</h3>
                    <p className="mt-1 text-sm text-gray-400">{workflow.description}</p>

                    {/* Trigger Badge */}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400">
                        ⚡ {workflow.trigger.label}
                      </span>
                      {/* Connected Integrations */}
                      <div className="flex items-center gap-1">
                        {workflow.integrations.map((int) => (
                          <span key={int} className="rounded bg-[#1e1e2e] px-1.5 py-0.5 text-xs" title={int}>
                            {platformIcons[int] || '🔌'}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {workflow.actions.map((action, i) => (
                        <span key={i} className="flex items-center gap-1 rounded border border-[#1e1e2e] px-2 py-0.5 text-xs text-gray-400">
                          <span className="text-gray-600">{i + 1}.</span> {action}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Status & Toggle */}
                <div className="flex flex-col items-end gap-3">
                  {/* Toggle */}
                  <button
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      workflow.isActive ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      workflow.isActive ? 'left-[22px]' : 'left-0.5'
                    }`} />
                  </button>

                  {/* Stats */}
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{workflow.runCount.toLocaleString()} runs</p>
                    <p className="text-xs text-green-400">{workflow.successRate} success</p>
                    {workflow.lastRunAt && (
                      <p className="text-xs text-gray-600">Last: {workflow.lastRunAt}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Suspense>
        ))}
      </div>

      {/* Create New Workflow CTA */}
      <div className="mt-8 rounded-xl border border-dashed border-indigo-500/30 bg-indigo-600/5 p-8 text-center">
        <h3 className="text-lg font-semibold text-white">Create Custom Automation</h3>
        <p className="mt-2 text-sm text-gray-400">
          Build custom workflows connecting any combination of your social media, CRM, email, and AI agents
        </p>
        <button className="mt-4 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500">
          + New Workflow
        </button>
      </div>
    </div>
  );
}
