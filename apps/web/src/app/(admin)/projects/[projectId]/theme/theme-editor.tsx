'use client';

import { useState } from 'react';
import { updateTheme } from '@/lib/actions/theme';
import type { ThemeState } from './theme-editor-types';
import { THEME_DEFAULTS } from './theme-editor-types';
import { ThemeEditorPreview } from './theme-editor-preview';
import { ThemeEditorControls } from './theme-editor-controls';

interface ThemeEditorProps {
  projectId: string;
  projectName: string;
  theme: {
    primaryColor: string;
    backgroundColor: string;
    fontFamily: string;
    welcomeMessage: string;
    logoUrl: string | null;
    borderRadius: string;
    actionButtonLabel: string;
  } | null;
}

export function ThemeEditor({ projectId, projectName, theme }: ThemeEditorProps) {
  const [state, setState] = useState<ThemeState>({
    primaryColor: theme?.primaryColor ?? THEME_DEFAULTS.primaryColor,
    backgroundColor: theme?.backgroundColor ?? THEME_DEFAULTS.backgroundColor,
    fontFamily: theme?.fontFamily ?? THEME_DEFAULTS.fontFamily,
    welcomeMessage: theme?.welcomeMessage ?? THEME_DEFAULTS.welcomeMessage,
    logoUrl: theme?.logoUrl ?? null,
    borderRadius: theme?.borderRadius ?? THEME_DEFAULTS.borderRadius,
    actionButtonLabel: theme?.actionButtonLabel ?? THEME_DEFAULTS.actionButtonLabel,
    showLogo: !!theme?.logoUrl,
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function handleChange(partial: Partial<ThemeState>) {
    setState((prev) => ({ ...prev, ...partial }));
    setMessage(null);
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const themeData: Record<string, unknown> = {
        primaryColor: state.primaryColor,
        backgroundColor: state.backgroundColor,
        fontFamily: state.fontFamily,
        welcomeMessage: state.welcomeMessage,
        borderRadius: state.borderRadius,
        actionButtonLabel: state.actionButtonLabel,
      };

      // Only send logoUrl as null if user explicitly removed it
      if (!state.logoUrl && !state.showLogo) {
        themeData.logoUrl = null;
      }

      const result = await updateTheme(projectId, themeData);

      if (result.success) {
        setMessage({ type: 'success', text: 'Theme saved successfully.' });
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Failed to save theme.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-10">
      {/* Controls — left side */}
      <div className="order-1">
        <ThemeEditorControls
          state={state}
          onChange={handleChange}
          projectId={projectId}
          saving={saving}
          onSave={handleSave}
          message={message}
        />
      </div>

      {/* Preview — right side, sticky on desktop */}
      <div className="order-2 lg:sticky lg:top-6 lg:self-start">
        <ThemeEditorPreview state={state} projectName={projectName} />
      </div>
    </div>
  );
}
