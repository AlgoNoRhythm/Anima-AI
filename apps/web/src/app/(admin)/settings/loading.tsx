export default function GlobalSettingsLoading() {
  return (
    <div className="max-w-2xl animate-pulse space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-32 bg-muted rounded-lg" />
        <div className="h-4 w-56 bg-muted rounded mt-2" />
      </div>

      {/* API Keys card */}
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-muted" />
          <div className="h-5 w-20 bg-muted rounded" />
        </div>
        <div className="space-y-4">
          <div>
            <div className="h-4 w-28 bg-muted rounded mb-2" />
            <div className="h-10 w-full bg-muted rounded-lg" />
          </div>
          <div>
            <div className="h-4 w-32 bg-muted rounded mb-2" />
            <div className="h-10 w-full bg-muted rounded-lg" />
          </div>
          <div className="h-3 w-80 bg-muted rounded mt-3" />
        </div>
      </div>

      {/* Profile card */}
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-muted" />
          <div className="h-5 w-16 bg-muted rounded" />
        </div>
        <div className="space-y-4">
          <div>
            <div className="h-4 w-12 bg-muted rounded mb-2" />
            <div className="h-10 w-full bg-muted rounded-lg" />
          </div>
          <div>
            <div className="h-4 w-12 bg-muted rounded mb-2" />
            <div className="h-10 w-full bg-muted rounded-lg" />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="h-10 w-32 bg-muted rounded-lg" />
    </div>
  );
}
