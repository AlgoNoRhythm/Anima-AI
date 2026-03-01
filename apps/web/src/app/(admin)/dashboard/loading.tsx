export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="h-8 w-40 bg-muted rounded-lg mb-2" />
        <div className="h-4 w-60 bg-muted rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-6 shadow-elevated">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="w-8 h-8 rounded-lg bg-muted" />
            </div>
            <div className="h-8 w-12 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
