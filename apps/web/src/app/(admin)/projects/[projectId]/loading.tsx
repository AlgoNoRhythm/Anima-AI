export default function ProjectLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex gap-1 mb-8 border-b pb-4">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-8 w-20 bg-muted rounded-lg" />
        ))}
      </div>
      <div className="h-8 w-48 bg-muted rounded-lg mb-2" />
      <div className="h-4 w-64 bg-muted rounded-lg mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-6 shadow-elevated">
          <div className="h-5 w-32 bg-muted rounded mb-4" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-3/4 bg-muted rounded" />
            <div className="h-4 w-1/2 bg-muted rounded" />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-elevated">
          <div className="h-5 w-32 bg-muted rounded mb-4" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-3/4 bg-muted rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
