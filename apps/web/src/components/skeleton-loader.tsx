/**
 * Skeleton loader for premium loading states.
 * Used in the Deal Room and other data-fetching pages.
 */
export function SkeletonLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-[#1e1e2e] ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-6">
      <SkeletonLoader className="mb-4 h-4 w-1/3" />
      <SkeletonLoader className="mb-2 h-8 w-1/2" />
      <SkeletonLoader className="h-3 w-2/3" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#1e1e2e]">
      <div className="border-b border-[#1e1e2e] bg-[#111118] px-4 py-3">
        <SkeletonLoader className="h-3 w-full" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-[#1e1e2e] bg-[#0d0d14] px-4 py-3">
          <SkeletonLoader className="h-3 w-1/4" />
          <SkeletonLoader className="h-3 w-1/3" />
          <SkeletonLoader className="h-3 w-1/6" />
          <SkeletonLoader className="h-3 w-1/6" />
        </div>
      ))}
    </div>
  );
}
