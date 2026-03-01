'use client';

import { useState } from 'react';
import { updateProject, deleteProject } from '@/lib/actions/projects';
import { useToast } from '@/components/toast';
import { useConfirm } from '@/components/confirm-dialog';

interface ProjectSettingsFormProps {
  projectId: string;
  settings: Record<string, unknown>;
}

export function ProjectSettingsForm({ projectId, settings }: ProjectSettingsFormProps) {
  const [maxFileSize, setMaxFileSize] = useState(
    (settings.maxFileSize as number) ?? 50,
  );
  const [maxDocuments, setMaxDocuments] = useState(
    (settings.maxDocuments as number) ?? 100,
  );
  const [rateLimit, setRateLimit] = useState(
    (settings.rateLimit as number) ?? 20,
  );
  const [enableAnalytics, setEnableAnalytics] = useState(
    (settings.enableAnalytics as boolean) ?? true,
  );
  const [allowAnonymousChat, setAllowAnonymousChat] = useState(
    (settings.allowAnonymousChat as boolean) ?? true,
  );
  const [saving, setSaving] = useState(false);
  const toastCtx = useToast();
  const confirm = useConfirm();

  async function handleSave() {
    setSaving(true);

    const result = await updateProject(projectId, {
      settings: {
        maxFileSize,
        maxDocuments,
        rateLimit,
        enableAnalytics,
        allowAnonymousChat,
      },
    });

    if (result.success) {
      toastCtx.success('Settings saved');
    } else {
      toastCtx.error(result.error || 'Failed to save');
    }
    setSaving(false);
  }

  async function handleDelete() {
    const confirmed = await confirm({
      title: 'Delete Project',
      description: 'Are you sure you want to delete this project? This action cannot be undone.',
      confirmLabel: 'Delete Project',
      variant: 'destructive',
    });
    if (!confirmed) return;
    await deleteProject(projectId);
  }

  return (
    <div className="space-y-6">

      <div className="rounded-xl border bg-card p-8 shadow-elevated">
        <h3 className="text-sm font-semibold mb-4">Limits</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Max File Size (MB)</label>
              <input
                type="number"
                value={maxFileSize}
                onChange={(e) => setMaxFileSize(Number(e.target.value))}
                min={1}
                max={500}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Max Documents</label>
              <input
                type="number"
                value={maxDocuments}
                onChange={(e) => setMaxDocuments(Number(e.target.value))}
                min={1}
                max={10000}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Rate Limit (requests per minute)</label>
            <input
              type="number"
              value={rateLimit}
              onChange={(e) => setRateLimit(Number(e.target.value))}
              min={1}
              max={1000}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-8 shadow-elevated">
        <h3 className="text-sm font-semibold mb-4">Permissions</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enableAnalytics}
              onChange={(e) => setEnableAnalytics(e.target.checked)}
              className="w-4 h-4 rounded border-input accent-gold"
            />
            <div>
              <p className="text-sm font-medium">Enable analytics</p>
              <p className="text-xs text-muted-foreground">Track usage and engagement data</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allowAnonymousChat}
              onChange={(e) => setAllowAnonymousChat(e.target.checked)}
              className="w-4 h-4 rounded border-input accent-gold"
            />
            <div>
              <p className="text-sm font-medium">Allow anonymous chat</p>
              <p className="text-xs text-muted-foreground">Let anyone chat without authentication</p>
            </div>
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-elevated transition-all duration-200 hover:shadow-elevated-lg hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        <button
          onClick={handleDelete}
          className="rounded-lg bg-destructive px-6 py-2.5 text-sm font-medium text-destructive-foreground shadow-elevated transition-all duration-200 hover:shadow-elevated-lg hover:bg-destructive/90 active:scale-[0.98]"
        >
          Delete Project
        </button>
      </div>
    </div>
  );
}
