interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  trend?: { value: string; positive: boolean };
}

export function KPICard({ title, value, subtitle, icon, trend }: KPICardProps) {
  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-6 transition-colors hover:border-indigo-600/30">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
          {trend && (
            <p className={`mt-2 text-sm font-medium ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}
