'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cloneProject } from '@/lib/actions/clone-project';
import { useToast } from '@/components/toast';
import { useConfirm } from '@/components/confirm-dialog';

interface CloneProjectButtonProps {
  projectId: string;
}

export function CloneProjectButton({ projectId }: CloneProjectButtonProps) {
  const [cloning, setCloning] = useState(false);
  const router = useRouter();
  const toastCtx = useToast();
  const confirm = useConfirm();

  async function handleClone() {
    const confirmed = await confirm({
      title: 'Duplicate Project',
      description:
        'This will create a copy of the project with all personality and theme settings. Documents and chat history will not be copied.',
      confirmLabel: 'Duplicate',
    });
    if (!confirmed) return;

    setCloning(true);
    const result = await cloneProject(projectId);
    setCloning(false);

    if (result.success && result.projectId) {
      toastCtx.success('Project duplicated successfully');
      router.push(`/projects/${result.projectId}`);
    } else {
      toastCtx.error(result.error ?? 'Failed to duplicate project');
    }
  }

  return (
    <button
      onClick={handleClone}
      disabled={cloning}
      className="rounded-lg border border-input bg-background px-6 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 hover:bg-accent hover:text-accent-foreground active:scale-[0.98] disabled:opacity-50"
    >
      {cloning ? 'Duplicating...' : 'Duplicate Project'}
    </button>
  );
}
