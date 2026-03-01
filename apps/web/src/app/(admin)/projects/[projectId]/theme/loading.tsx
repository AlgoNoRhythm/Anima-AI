export default function ThemeLoading() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-32 bg-muted rounded-lg" />
        <div className="h-4 w-72 bg-muted rounded mt-2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Preview skeleton */}
        <div className="order-2 lg:order-1">
          <div className="rounded-xl border border-border/60 bg-muted/30 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-b border-border/40">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-muted" />
                <div className="w-2.5 h-2.5 rounded-full bg-muted" />
                <div className="w-2.5 h-2.5 rounded-full bg-muted" />
              </div>
              <div className="h-3 w-16 bg-muted rounded ml-2" />
            </div>
            <div className="h-[520px] bg-muted/20" />
          </div>
        </div>

        {/* Controls skeleton */}
        <div className="order-1 lg:order-2 space-y-8">
          {/* Colors */}
          <div>
            <div className="h-4 w-16 bg-muted rounded mb-4" />
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="h-4 w-24 bg-muted rounded mb-2" />
                <div className="h-3 w-36 bg-muted rounded mb-2.5" />
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-muted rounded-lg" />
                  <div className="h-9 w-28 bg-muted rounded-lg" />
                </div>
              </div>
              <div>
                <div className="h-4 w-32 bg-muted rounded mb-2" />
                <div className="h-3 w-28 bg-muted rounded mb-2.5" />
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-muted rounded-lg" />
                  <div className="h-9 w-28 bg-muted rounded-lg" />
                </div>
              </div>
            </div>
          </div>

          {/* Typography */}
          <div className="border-t pt-6">
            <div className="h-4 w-24 bg-muted rounded mb-4" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-11 bg-muted rounded-lg" />
              <div className="h-11 bg-muted rounded-lg" />
              <div className="h-11 bg-muted rounded-lg" />
              <div className="h-11 bg-muted rounded-lg" />
            </div>
          </div>

          {/* Shape */}
          <div className="border-t pt-6">
            <div className="h-4 w-16 bg-muted rounded mb-4" />
            <div className="flex gap-2">
              <div className="h-16 flex-1 bg-muted rounded-lg" />
              <div className="h-16 flex-1 bg-muted rounded-lg" />
              <div className="h-16 flex-1 bg-muted rounded-lg" />
              <div className="h-16 flex-1 bg-muted rounded-lg" />
              <div className="h-16 flex-1 bg-muted rounded-lg" />
            </div>
          </div>

          {/* Branding */}
          <div className="border-t pt-6">
            <div className="h-4 w-20 bg-muted rounded mb-4" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-muted rounded-lg" />
              <div className="flex-1">
                <div className="h-10 bg-muted rounded-lg" />
              </div>
            </div>
            <div className="mt-4">
              <div className="h-4 w-32 bg-muted rounded mb-2" />
              <div className="h-16 bg-muted rounded-lg" />
            </div>
          </div>

          {/* Save button */}
          <div className="pt-2">
            <div className="h-10 w-full bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
