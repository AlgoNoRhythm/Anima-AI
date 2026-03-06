'use client';

import { useMemo } from 'react';
import { computeThemeVars } from '@anima-ai/shared';
import type { FeedbackConfigState } from './feedback-editor-types';

interface FeedbackEditorPreviewProps {
  state: FeedbackConfigState;
  themeColors?: { primaryColor?: string; backgroundColor?: string };
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="w-6 h-6"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5z"
      />
    </svg>
  );
}

export function FeedbackEditorPreview({ state, themeColors }: FeedbackEditorPreviewProps) {
  const themeStyle = useMemo(() => {
    if (!themeColors?.primaryColor && !themeColors?.backgroundColor) return undefined;
    const cssVars = computeThemeVars({
      primaryColor: themeColors?.primaryColor,
      backgroundColor: themeColors?.backgroundColor,
    });
    const style: React.CSSProperties = {};
    const styleVars = style as Record<string, string>;
    for (const [key, value] of Object.entries(cssVars)) {
      if (key === 'colorScheme') {
        style.colorScheme = value;
      } else if (key === 'fontFamily') {
        style.fontFamily = value;
      } else {
        styleVars[key] = value;
      }
    }
    return style;
  }, [themeColors]);

  if (!state.enabled) {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/30 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-b border-border/40">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
          </div>
          <span className="text-[10px] text-muted-foreground/60 ml-2">Preview</span>
        </div>
        <div className="flex items-center justify-center h-80 text-muted-foreground text-sm">
          Enable feedback to see preview
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-b border-border/40">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
        </div>
        <span className="text-[10px] text-muted-foreground/60 ml-2">Feedback Form Preview</span>
      </div>

      {/* Theme-aware preview body */}
      <div
        className="p-6 bg-chat-surface text-foreground"
        style={{ minHeight: 320, ...themeStyle }}
      >
        <div className="max-w-sm mx-auto space-y-5">
          {/* Ratings */}
          {state.ratings.map((r) => (
            <div key={r.id} className="text-center">
              <p className="text-sm font-medium mb-2">
                {r.label}
                {r.required && <span className="text-destructive ml-0.5">*</span>}
              </p>
              <div className="flex justify-center gap-1 text-chat-accent">
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon key={star} filled={star <= 4} />
                ))}
              </div>
            </div>
          ))}

          {/* Questions */}
          {state.questions.map((q) => (
            <div key={q.id}>
              <label className="block text-sm font-medium mb-1.5">
                {q.label}
                {q.required && <span className="text-destructive ml-0.5">*</span>}
              </label>
              <div className="h-20 rounded-lg border border-chat-border bg-chat-bg px-3 py-2 text-xs text-chat-muted">
                Type your answer...
              </div>
            </div>
          ))}

          {/* Empty state hint */}
          {state.ratings.length === 0 && state.questions.length === 0 && (
            <div className="text-center text-chat-muted text-sm py-8">
              Add ratings or questions to see them here
            </div>
          )}

          {/* Submit button */}
          {(state.ratings.length > 0 || state.questions.length > 0) && (
            <button
              type="button"
              className="w-full rounded-lg bg-chat-accent text-chat-accent-fg px-4 py-2.5 text-sm font-medium"
              disabled
            >
              {state.submitButtonLabel}
            </button>
          )}

          {/* Thank you preview */}
          <div className="text-center pt-2 border-t border-dashed border-chat-border">
            <p className="text-[10px] text-chat-muted mb-1">After submission:</p>
            <p className="text-sm">{state.thankYouMessage}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
