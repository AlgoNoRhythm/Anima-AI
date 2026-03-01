export default function PersonalityLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-44 bg-muted rounded-lg" />
        <div className="h-4 w-80 bg-muted rounded mt-2" />
      </div>

      {/* Name field */}
      <div>
        <div className="h-4 w-16 bg-muted rounded mb-2" />
        <div className="h-10 w-full bg-muted rounded-lg" />
        <div className="h-3 w-64 bg-muted rounded mt-2" />
      </div>

      {/* System Prompt field */}
      <div>
        <div className="h-4 w-28 bg-muted rounded mb-2" />
        <div className="h-32 w-full bg-muted rounded-lg" />
        <div className="h-3 w-72 bg-muted rounded mt-2" />
      </div>

      {/* Tone & Temperature row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="h-4 w-12 bg-muted rounded mb-2" />
          <div className="h-10 w-full bg-muted rounded-lg" />
        </div>
        <div>
          <div className="h-4 w-24 bg-muted rounded mb-2" />
          <div className="h-10 w-full bg-muted rounded-lg" />
        </div>
      </div>

      {/* Model Configuration section */}
      <div className="border-t pt-6 mt-6">
        <div className="h-4 w-36 bg-muted rounded mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="h-4 w-16 bg-muted rounded mb-2" />
            <div className="h-10 w-full bg-muted rounded-lg" />
          </div>
          <div>
            <div className="h-4 w-14 bg-muted rounded mb-2" />
            <div className="h-10 w-full bg-muted rounded-lg" />
          </div>
        </div>
      </div>

      {/* Guardrails section */}
      <div className="border-t pt-6 mt-6">
        <div className="h-4 w-24 bg-muted rounded mb-4" />
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-muted rounded" />
            <div>
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-56 bg-muted rounded mt-1" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-muted rounded" />
            <div>
              <div className="h-4 w-28 bg-muted rounded" />
              <div className="h-3 w-64 bg-muted rounded mt-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Submit button */}
      <div className="pt-2">
        <div className="h-10 w-36 bg-muted rounded-lg" />
      </div>
    </div>
  );
}
