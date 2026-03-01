'use client';

import { useState, useEffect, useCallback } from 'react';
import { saveApiKey, deleteApiKey, getApiKeyStatus } from '@/lib/actions/api-keys';

interface SettingsFormProps {
  userName: string;
  userEmail: string;
  initialKeyStatus: { openai: boolean; anthropic: boolean };
}

export function SettingsForm({ userName, userEmail, initialKeyStatus }: SettingsFormProps) {
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [keyStatus, setKeyStatus] = useState(initialKeyStatus);
  const [deleting, setDeleting] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    const status = await getApiKeyStatus();
    setKeyStatus(status);
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      if (openaiKey) {
        const result = await saveApiKey('openai', openaiKey);
        if (!result.success) {
          setMessage({ type: 'error', text: result.error ?? 'Failed to save OpenAI key' });
          setSaving(false);
          return;
        }
      }
      if (anthropicKey) {
        const result = await saveApiKey('anthropic', anthropicKey);
        if (!result.success) {
          setMessage({ type: 'error', text: result.error ?? 'Failed to save Anthropic key' });
          setSaving(false);
          return;
        }
      }
      setMessage({ type: 'success', text: 'Settings saved' });
      setOpenaiKey('');
      setAnthropicKey('');
      await refreshStatus();
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    }
    setSaving(false);
  }

  async function handleDeleteKey(provider: 'openai' | 'anthropic') {
    setDeleting(provider);
    try {
      // We need to find the key ID to delete — use getApiKeyStatus indirectly
      // For simplicity, save an empty-ish approach: just re-save with a marker
      // Actually, let's use the API route approach
      const res = await fetch('/api/settings/api-keys');
      if (res.ok) {
        const keys = await res.json();
        const key = keys.find((k: { provider: string }) => k.provider === provider);
        if (key) {
          await deleteApiKey(key.id);
          setMessage({ type: 'success', text: `${provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key removed` });
          await refreshStatus();
        }
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete API key' });
    }
    setDeleting(null);
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`rounded-md p-3 text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="rounded-xl border bg-card p-8 shadow-elevated">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg gold-gradient flex items-center justify-center text-white shadow-gold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
          </div>
          <h2 className="text-lg font-semibold">API Keys</h2>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Anthropic API Key</label>
              {keyStatus.anthropic ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 rounded-full px-2.5 py-0.5">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    Configured
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteKey('anthropic')}
                    disabled={deleting === 'anthropic'}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  >
                    {deleting === 'anthropic' ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">
                  Not set
                </span>
              )}
            </div>
            <input
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
              placeholder={keyStatus.anthropic ? 'Enter new key to replace...' : 'sk-ant-...'}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">OpenAI API Key</label>
              {keyStatus.openai ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 rounded-full px-2.5 py-0.5">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    Configured
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteKey('openai')}
                    disabled={deleting === 'openai'}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  >
                    {deleting === 'openai' ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">
                  Not set
                </span>
              )}
            </div>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
              placeholder={keyStatus.openai ? 'Enter new key to replace...' : 'sk-...'}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Configure an API key for at least one provider to enable document indexing and chatting.
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-8 shadow-elevated">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <h2 className="text-lg font-semibold">Profile</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <input
              type="text"
              defaultValue={userName}
              disabled
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm opacity-60"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              defaultValue={userEmail}
              disabled
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm opacity-60"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || (!openaiKey && !anthropicKey)}
        className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-elevated transition-all duration-200 hover:shadow-elevated-lg hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}
