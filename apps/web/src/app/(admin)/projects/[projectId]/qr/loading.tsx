export default function QRLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-32 bg-muted rounded-lg" />
        <div className="h-4 w-72 bg-muted rounded mt-2" />
      </div>

      {/* Two-column grid: settings + preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Settings panel */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="h-4 w-24 bg-muted rounded mb-4" />
          <div className="space-y-4">
            {/* Style */}
            <div>
              <div className="h-4 w-12 bg-muted rounded mb-2" />
              <div className="h-10 w-full bg-muted rounded-lg" />
            </div>
            {/* Colors row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="h-4 w-20 bg-muted rounded mb-2" />
                <div className="flex items-center gap-2">
                  <div className="h-9 w-12 bg-muted rounded-lg" />
                  <div className="h-3 w-14 bg-muted rounded" />
                </div>
              </div>
              <div>
                <div className="h-4 w-24 bg-muted rounded mb-2" />
                <div className="flex items-center gap-2">
                  <div className="h-9 w-12 bg-muted rounded-lg" />
                  <div className="h-3 w-14 bg-muted rounded" />
                </div>
              </div>
            </div>
            {/* Error Correction */}
            <div>
              <div className="h-4 w-28 bg-muted rounded mb-2" />
              <div className="h-10 w-full bg-muted rounded-lg" />
            </div>
            {/* Size */}
            <div>
              <div className="h-4 w-10 bg-muted rounded mb-2" />
              <div className="h-10 w-full bg-muted rounded-lg" />
            </div>
            {/* URL preview */}
            <div className="rounded-lg bg-muted/50 h-14" />
            {/* Buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              <div className="h-10 w-28 bg-muted rounded-lg" />
              <div className="h-10 w-28 bg-muted rounded-lg" />
              <div className="h-10 w-28 bg-muted rounded-lg" />
            </div>
          </div>
        </div>

        {/* Preview panel */}
        <div className="rounded-xl border bg-card p-8 shadow-sm flex flex-col items-center justify-center min-h-[320px]">
          <div className="w-48 h-48 rounded-xl bg-muted mb-4" />
          <div className="h-4 w-36 bg-muted rounded" />
        </div>
      </div>

      {/* Embed Widget section */}
      <div className="mt-12 rounded-xl border bg-card p-6 shadow-sm">
        <div className="h-5 w-28 bg-muted rounded mb-1" />
        <div className="h-4 w-80 bg-muted rounded mt-2 mb-6" />
        <div>
          <div className="h-4 w-24 bg-muted rounded mb-2" />
          <div className="h-3 w-64 bg-muted rounded mb-2" />
          <div className="h-16 w-full bg-muted/50 rounded-lg" />
        </div>
        <div className="mt-6">
          <div className="h-4 w-44 bg-muted rounded mb-2" />
          <div className="h-3 w-72 bg-muted rounded mb-2" />
          <div className="h-12 w-full bg-muted/50 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
