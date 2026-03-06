export default function FeedbackLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="h-9 w-48 bg-muted rounded-lg" />
        <div className="h-5 w-80 bg-muted rounded-lg mt-2" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-10">
        <div className="space-y-6">
          <div className="h-10 bg-muted rounded-lg" />
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-48 bg-muted rounded-lg" />
        </div>
        <div className="h-80 bg-muted rounded-xl" />
      </div>
    </div>
  );
}
