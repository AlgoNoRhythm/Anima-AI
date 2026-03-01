export default function DocumentsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-48 bg-muted rounded-lg" />
        <div className="h-4 w-80 bg-muted rounded mt-2" />
      </div>

      {/* Upload zone skeleton */}
      <div className="rounded-xl border-2 border-dashed bg-card p-8">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-muted mb-3" />
          <div className="h-4 w-52 bg-muted rounded" />
          <div className="h-3 w-36 bg-muted rounded mt-2" />
        </div>
      </div>

      {/* Document list rows */}
      <div className="rounded-xl border bg-card shadow-sm divide-y">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted" />
              <div>
                <div className="h-4 w-44 bg-muted rounded" />
                <div className="h-3 w-28 bg-muted rounded mt-1.5" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-5 w-16 bg-muted rounded-full" />
              <div className="w-4 h-4 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
