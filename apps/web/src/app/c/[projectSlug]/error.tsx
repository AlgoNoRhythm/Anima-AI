'use client';

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log full error details to help debug
  console.error('[ChatError]', error.message, error.stack);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center max-w-lg">
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-sm text-muted-foreground mb-4">
          {error.message || 'Unable to load this chatbot. Please try again.'}
        </p>
        {process.env.NODE_ENV === 'development' && error.stack && (
          <pre className="text-left text-xs bg-muted rounded-lg p-3 mb-4 overflow-auto max-h-48 whitespace-pre-wrap break-words">
            {error.stack}
          </pre>
        )}
        <button
          onClick={reset}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
