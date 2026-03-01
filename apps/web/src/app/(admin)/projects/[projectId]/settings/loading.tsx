export default function SettingsLoading() {
  return (
    <div className="max-w-2xl animate-pulse space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-44 bg-muted rounded-lg" />
        <div className="h-4 w-72 bg-muted rounded mt-2" />
      </div>

      {/* Limits card */}
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <div className="h-4 w-16 bg-muted rounded mb-4" />
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="h-4 w-28 bg-muted rounded mb-2" />
              <div className="h-10 w-full bg-muted rounded-lg" />
            </div>
            <div>
              <div className="h-4 w-28 bg-muted rounded mb-2" />
              <div className="h-10 w-full bg-muted rounded-lg" />
            </div>
          </div>
          <div>
            <div className="h-4 w-44 bg-muted rounded mb-2" />
            <div className="h-10 w-full bg-muted rounded-lg" />
          </div>
        </div>
      </div>

      {/* Permissions card */}
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <div className="h-4 w-24 bg-muted rounded mb-4" />
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-muted rounded" />
            <div>
              <div className="h-4 w-28 bg-muted rounded" />
              <div className="h-3 w-44 bg-muted rounded mt-1" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-muted rounded" />
            <div>
              <div className="h-4 w-36 bg-muted rounded" />
              <div className="h-3 w-52 bg-muted rounded mt-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <div className="h-10 w-32 bg-muted rounded-lg" />
        <div className="h-10 w-32 bg-muted rounded-lg" />
      </div>
    </div>
  );
}
