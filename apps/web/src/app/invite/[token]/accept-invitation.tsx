'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { acceptInvitation } from '@/lib/actions/team';

interface AcceptInvitationProps {
  token: string;
  projectName: string;
}

export function AcceptInvitation({ token, projectName }: AcceptInvitationProps) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setAccepting(true);
    setError(null);

    try {
      const result = await acceptInvitation(token);
      if (result.success && result.projectId) {
        router.push(`/projects/${result.projectId}`);
      } else {
        setError(result.error ?? 'Failed to accept invitation.');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleAccept}
        disabled={accepting}
        className="rounded-lg bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow-elevated transition-all duration-200 hover:shadow-elevated-lg hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
      >
        {accepting ? 'Accepting...' : `Join ${projectName}`}
      </button>
      {error && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
