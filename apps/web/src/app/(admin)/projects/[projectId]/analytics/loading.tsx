export default function AnalyticsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="h-8 w-36 bg-muted rounded-lg" />
          <div className="h-4 w-64 bg-muted rounded mt-2" />
        </div>
        <div className="h-10 w-44 bg-muted rounded-lg" />
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-28 bg-muted rounded" />
              <div className="w-8 h-8 rounded-lg bg-muted" />
            </div>
            <div className="h-8 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="h-5 w-36 bg-muted rounded mb-4" />
        <div className="h-64 w-full bg-muted/50 rounded-lg" />
      </div>

      {/* Feedback responses skeleton */}
      <div className="mt-8 rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-44 bg-muted rounded" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-16 bg-muted rounded-lg" />
          ))}
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-28 bg-muted rounded-lg" />
          ))}
        </div>
        <div className="h-48 w-full bg-muted/50 rounded-lg" />
      </div>
    </div>
  );
}
