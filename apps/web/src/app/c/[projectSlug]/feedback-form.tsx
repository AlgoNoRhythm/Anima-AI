'use client';

import { useState } from 'react';
import { submitFeedbackSurvey } from '@/lib/api-client';
import type { ChatUITranslations } from '@/lib/locale/types';

interface FeedbackRatingConfig {
  id: string;
  label: string;
  required: boolean;
}

interface FeedbackQuestion {
  id: string;
  label: string;
  type: 'text';
  required: boolean;
}

export interface FeedbackConfig {
  enabled: boolean;
  ratings: FeedbackRatingConfig[];
  questions: FeedbackQuestion[];
  submitButtonLabel: string;
  thankYouMessage: string;
}

interface FeedbackFormProps {
  config: FeedbackConfig;
  sessionToken: string | null;
  primaryColor?: string;
  onClose: () => void;
  t?: ChatUITranslations;
}

function StarButton({ filled, onClick, color }: { filled: boolean; onClick: () => void; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`transition-colors ${filled ? '' : 'text-chat-muted/40 hover:text-chat-muted/60'}`}
      style={filled ? { color: color || 'hsl(var(--chat-accent))' } : undefined}
    >
      <svg
        className="w-8 h-8"
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
    </button>
  );
}

export function FeedbackForm({ config, sessionToken, primaryColor, onClose, t }: FeedbackFormProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRating(ratingId: string, value: number) {
    setRatings((prev) => ({ ...prev, [ratingId]: value }));
  }

  function updateAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit() {
    setError(null);

    // Validate required ratings
    for (const r of config.ratings) {
      if (r.required && (!ratings[r.id] || ratings[r.id] === 0)) {
        setError(t ? t.pleaseSelectRating.replace('{label}', r.label) : `Please select a rating for: "${r.label}"`);
        return;
      }
    }
    // Validate required questions
    for (const q of config.questions) {
      if (q.required && !(answers[q.id]?.trim())) {
        setError(t ? t.pleaseAnswer.replace('{label}', q.label) : `Please answer: "${q.label}"`);
        return;
      }
    }

    if (!sessionToken) {
      setError(t?.noActiveSession ?? 'No active session. Please send a message first.');
      return;
    }

    setSubmitting(true);
    try {
      await submitFeedbackSurvey(
        {
          ratings: config.ratings
            .filter((r) => (ratings[r.id] ?? 0) > 0)
            .map((r) => ({ ratingId: r.id, value: ratings[r.id]! })),
          answers: config.questions
            .filter((q) => answers[q.id]?.trim())
            .map((q) => ({ questionId: q.id, value: answers[q.id]! })),
        },
        sessionToken,
      );
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : (t?.failedToSubmitFeedback ?? 'Failed to submit feedback'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-chat-surface border border-chat-border shadow-elevated-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-chat-border">
          <h2 className="text-base font-semibold text-foreground">
            {submitted ? (t?.thankYou ?? 'Thank You') : (t?.shareFeedback ?? 'Share Feedback')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-chat-muted hover:text-foreground hover:bg-muted transition-colors"
            aria-label={t?.close ?? 'Close'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 max-h-[70vh] overflow-y-auto">
          {submitted ? (
            <div className="text-center py-6">
              <svg className="w-12 h-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p className="text-foreground">{config.thankYouMessage}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Ratings */}
              {config.ratings.map((r) => (
                <div key={r.id} className="text-center">
                  <p className="text-sm font-medium text-foreground mb-2">
                    {r.label}
                    {r.required && <span className="text-destructive ml-0.5">*</span>}
                  </p>
                  <div className="flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <StarButton
                        key={star}
                        filled={star <= (ratings[r.id] ?? 0)}
                        onClick={() => updateRating(r.id, star)}
                        color={primaryColor}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Questions */}
              {config.questions.map((q) => (
                <div key={q.id}>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {q.label}
                    {q.required && <span className="text-destructive ml-0.5">*</span>}
                  </label>
                  <textarea
                    rows={3}
                    value={answers[q.id] ?? ''}
                    onChange={(e) => updateAnswer(q.id, e.target.value)}
                    className="w-full rounded-lg border border-chat-border bg-chat-bg px-3 py-2 text-sm text-foreground placeholder:text-chat-muted focus-visible:outline-none focus-visible:border-chat-accent/40 transition-colors"
                    placeholder={t?.typeYourAnswer ?? 'Type your answer...'}
                  />
                </div>
              ))}

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full rounded-lg bg-chat-accent text-chat-accent-fg py-2.5 text-sm font-medium transition-all duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? (t?.submitting ?? 'Submitting...') : config.submitButtonLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
