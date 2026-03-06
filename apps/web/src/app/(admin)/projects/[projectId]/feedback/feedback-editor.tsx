'use client';

import { useState } from 'react';
import { updateFeedbackConfig } from '@/lib/actions/feedback';
import type { FeedbackConfigState } from './feedback-editor-types';
import { FEEDBACK_DEFAULTS } from './feedback-editor-types';
import { FeedbackEditorControls } from './feedback-editor-controls';
import { FeedbackEditorPreview } from './feedback-editor-preview';

import type { TranslationsMap, FeedbackConfigTranslations } from '@/lib/locale/types';

interface FeedbackEditorProps {
  projectId: string;
  config: (FeedbackConfigState & { translations?: TranslationsMap<FeedbackConfigTranslations> }) | null;
  themeColors?: { primaryColor?: string; backgroundColor?: string };
}

export function FeedbackEditor({ projectId, config, themeColors }: FeedbackEditorProps) {
  const [state, setState] = useState<FeedbackConfigState>({
    enabled: config?.enabled ?? FEEDBACK_DEFAULTS.enabled,
    ratings: config?.ratings ?? FEEDBACK_DEFAULTS.ratings,
    questions: config?.questions ?? FEEDBACK_DEFAULTS.questions,
    submitButtonLabel: config?.submitButtonLabel ?? FEEDBACK_DEFAULTS.submitButtonLabel,
    thankYouMessage: config?.thankYouMessage ?? FEEDBACK_DEFAULTS.thankYouMessage,
    translations: config?.translations ?? {},
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function handleChange(partial: Partial<FeedbackConfigState>) {
    setState((prev) => ({ ...prev, ...partial }));
    setMessage(null);
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const result = await updateFeedbackConfig(projectId, { ...state });

      if (result.success) {
        setMessage({ type: 'success', text: 'Feedback settings saved successfully.' });
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Failed to save settings.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-10">
      <div className="order-1">
        <FeedbackEditorControls
          state={state}
          onChange={handleChange}
          saving={saving}
          onSave={handleSave}
          message={message}
        />
      </div>
      <div className="order-2 lg:sticky lg:top-6 lg:self-start">
        <FeedbackEditorPreview state={state} themeColors={themeColors} />
      </div>
    </div>
  );
}
