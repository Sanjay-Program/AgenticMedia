import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const navigation = [
  { name: 'Overview', href: '/', icon: '📊' },
  { name: 'AI Swarm', href: '/swarm', icon: '🤖' },
  { name: 'Creators', href: '/creators', icon: '🎬' },
  { name: 'Campaigns', href: '/campaigns', icon: '📈' },
  { name: 'Finance', href: '/finance', icon: '💰' },
  { name: 'Deal Room', href: '/deal/demo', icon: '🤝' },
  { name: 'Social Media', href: '/social', icon: '📱' },
  { name: 'Integrations', href: '/integrations', icon: '🔗' },
  { name: 'Automations', href: '/automations', icon: '⚡' },
  { name: 'API Docs', href: `${API_URL}/api-docs`, icon: '📋' },
];

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#1e1e2e] bg-[#111118]">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-[#1e1e2e] px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
          A
        </div>
        <span className="text-lg font-semibold text-white">AgenticMedia</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-[#1e1e2e] hover:text-white"
          >
            <span className="text-base">{item.icon}</span>
            {item.name}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#1e1e2e] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-indigo-600/20 text-center leading-8 text-xs text-indigo-400">
            AI
          </div>
          <div>
            <p className="text-sm font-medium text-white">Enterprise Plan</p>
            <p className="text-xs text-gray-500">v1.0.0</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
