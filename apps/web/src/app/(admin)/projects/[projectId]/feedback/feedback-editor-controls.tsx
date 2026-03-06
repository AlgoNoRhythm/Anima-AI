'use client';

import { useState } from 'react';
import type { FeedbackConfigState, FeedbackQuestion, FeedbackRating } from './feedback-editor-types';
import { LocaleTabs } from '@/components/locale-tabs';
import { TranslatableField } from '@/components/translatable-field';
import type { SupportedLocale, FeedbackConfigTranslations } from '@/lib/locale/types';

interface FeedbackEditorControlsProps {
  state: FeedbackConfigState;
  onChange: (partial: Partial<FeedbackConfigState>) => void;
  saving: boolean;
  onSave: () => void;
  message: { type: 'success' | 'error'; text: string } | null;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function getFeedbackTranslation(
  state: FeedbackConfigState,
  locale: SupportedLocale,
  field: keyof FeedbackConfigTranslations,
  itemId?: string,
): string {
  if (locale === 'en') return '';
  const localeData = state.translations[locale];
  if (!localeData) return '';
  if (field === 'ratingLabels' && itemId) {
    return (localeData.ratingLabels as Record<string, string> | undefined)?.[itemId] ?? '';
  }
  if (field === 'questionLabels' && itemId) {
    return (localeData.questionLabels as Record<string, string> | undefined)?.[itemId] ?? '';
  }
  return (localeData[field] as string | undefined) ?? '';
}

function setFeedbackTranslation(
  state: FeedbackConfigState,
  onChange: (partial: Partial<FeedbackConfigState>) => void,
  locale: SupportedLocale,
  field: keyof FeedbackConfigTranslations,
  value: string,
  itemId?: string,
) {
  if (locale === 'en') return;
  const current = state.translations[locale] ?? {};
  if ((field === 'ratingLabels' || field === 'questionLabels') && itemId) {
    const existing = (current[field] as Record<string, string> | undefined) ?? {};
    onChange({
      translations: {
        ...state.translations,
        [locale]: { ...current, [field]: { ...existing, [itemId]: value } },
      },
    });
  } else {
    onChange({
      translations: {
        ...state.translations,
        [locale]: { ...current, [field]: value },
      },
    });
  }
}

export function FeedbackEditorControls({
  state,
  onChange,
  saving,
  onSave,
  message,
}: FeedbackEditorControlsProps) {
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>('en');
  const [draftQuestionLabel, setDraftQuestionLabel] = useState('');
  const [draftRatingLabel, setDraftRatingLabel] = useState('');

  // --- Rating helpers ---
  function addRating() {
    const trimmed = draftRatingLabel.trim();
    if (!trimmed || state.ratings.length >= 10) return;
    const newRating: FeedbackRating = {
      id: generateId(),
      label: trimmed,
      required: false,
    };
    onChange({ ratings: [...state.ratings, newRating] });
    setDraftRatingLabel('');
  }

  function removeRating(id: string) {
    onChange({ ratings: state.ratings.filter((r) => r.id !== id) });
  }

  function updateRating(id: string, updates: Partial<FeedbackRating>) {
    onChange({
      ratings: state.ratings.map((r) =>
        r.id === id ? { ...r, ...updates } : r,
      ),
    });
  }

  // --- Question helpers ---
  function addQuestion() {
    const trimmed = draftQuestionLabel.trim();
    if (!trimmed || state.questions.length >= 10) return;
    const newQuestion: FeedbackQuestion = {
      id: generateId(),
      label: trimmed,
      type: 'text',
      required: false,
    };
    onChange({ questions: [...state.questions, newQuestion] });
    setDraftQuestionLabel('');
  }

  function removeQuestion(id: string) {
    onChange({ questions: state.questions.filter((q) => q.id !== id) });
  }

  function updateQuestion(id: string, updates: Partial<FeedbackQuestion>) {
    onChange({
      questions: state.questions.map((q) =>
        q.id === id ? { ...q, ...updates } : q,
      ),
    });
  }

  return (
    <div className="space-y-8">
      {/* Locale tabs */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2">Translation Language</label>
        <LocaleTabs activeLocale={activeLocale} onChange={setActiveLocale} />
      </div>

      {/* Enable toggle */}
      <section>
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={state.enabled}
              onChange={(e) => onChange({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-muted rounded-full peer-checked:bg-primary transition-colors" />
            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
          </div>
          <div>
            <span className="text-sm font-medium">Enable Feedback Survey</span>
            <p className="text-xs text-muted-foreground">Show a &quot;Leave a feedback&quot; link in the chat footer.</p>
          </div>
        </label>
      </section>

      {/* Ratings */}
      <section className="border-t pt-6">
        <h3 className="text-sm font-semibold mb-4">Ratings</h3>
        <p className="text-xs text-muted-foreground mb-3">Add star rating prompts for users. Max 10.</p>

        {state.ratings.length > 0 && (
          <div className="space-y-3 mb-4">
            {state.ratings.map((r) => (
              <div key={r.id} className="flex items-start gap-2 rounded-lg border border-border p-3">
                <div className="flex-1 min-w-0">
                  {activeLocale === 'en' ? (
                    <>
                      <input
                        type="text"
                        value={r.label}
                        onChange={(e) => updateRating(r.id, { label: e.target.value })}
                        maxLength={200}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={r.required}
                          onChange={(e) => updateRating(r.id, { required: e.target.checked })}
                          className="rounded border-input"
                        />
                        <span className="text-xs text-muted-foreground">Required</span>
                      </label>
                    </>
                  ) : (
                    <TranslatableField locale={activeLocale}>
                      <input
                        type="text"
                        value={getFeedbackTranslation(state, activeLocale, 'ratingLabels', r.id)}
                        onChange={(e) => setFeedbackTranslation(state, onChange, activeLocale, 'ratingLabels', e.target.value, r.id)}
                        maxLength={200}
                        placeholder={r.label}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </TranslatableField>
                  )}
                </div>
                {activeLocale === 'en' && (
                  <button
                    type="button"
                    onClick={() => removeRating(r.id)}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                    aria-label="Remove rating"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {state.ratings.length < 10 && (
          <div className="flex gap-2">
            <input
              type="text"
              value={draftRatingLabel}
              onChange={(e) => setDraftRatingLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addRating();
                }
              }}
              maxLength={200}
              placeholder="e.g. How would you rate your experience?"
              className="flex-1 h-9 rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              onClick={addRating}
              disabled={!draftRatingLabel.trim()}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium shadow-sm transition-all duration-200 hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              Add
            </button>
          </div>
        )}
      </section>

      {/* Questions */}
      <section className="border-t pt-6">
        <h3 className="text-sm font-semibold mb-4">Questions</h3>
        <p className="text-xs text-muted-foreground mb-3">Add free-text questions for users to answer. Max 10.</p>

        {state.questions.length > 0 && (
          <div className="space-y-3 mb-4">
            {state.questions.map((q) => (
              <div key={q.id} className="flex items-start gap-2 rounded-lg border border-border p-3">
                <div className="flex-1 min-w-0">
                  {activeLocale === 'en' ? (
                    <>
                      <input
                        type="text"
                        value={q.label}
                        onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                        maxLength={200}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                          className="rounded border-input"
                        />
                        <span className="text-xs text-muted-foreground">Required</span>
                      </label>
                    </>
                  ) : (
                    <TranslatableField locale={activeLocale}>
                      <input
                        type="text"
                        value={getFeedbackTranslation(state, activeLocale, 'questionLabels', q.id)}
                        onChange={(e) => setFeedbackTranslation(state, onChange, activeLocale, 'questionLabels', e.target.value, q.id)}
                        maxLength={200}
                        placeholder={q.label}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </TranslatableField>
                  )}
                </div>
                {activeLocale === 'en' && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(q.id)}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                    aria-label="Remove question"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {state.questions.length < 10 && (
          <div className="flex gap-2">
            <input
              type="text"
              value={draftQuestionLabel}
              onChange={(e) => setDraftQuestionLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addQuestion();
                }
              }}
              maxLength={200}
              placeholder="e.g. What could we improve?"
              className="flex-1 h-9 rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              onClick={addQuestion}
              disabled={!draftQuestionLabel.trim()}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium shadow-sm transition-all duration-200 hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              Add
            </button>
          </div>
        )}
      </section>

      {/* Labels */}
      <section className="border-t pt-6">
        <h3 className="text-sm font-semibold mb-4">Labels</h3>
        <div className="space-y-4">
          <TranslatableField locale={activeLocale}>
            <div>
              <label className="block text-sm font-medium mb-1.5">Submit Button</label>
              {activeLocale === 'en' ? (
                <input
                  type="text"
                  value={state.submitButtonLabel}
                  onChange={(e) => onChange({ submitButtonLabel: e.target.value })}
                  maxLength={50}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              ) : (
                <input
                  type="text"
                  value={getFeedbackTranslation(state, activeLocale, 'submitButtonLabel')}
                  onChange={(e) => setFeedbackTranslation(state, onChange, activeLocale, 'submitButtonLabel', e.target.value)}
                  maxLength={50}
                  placeholder={state.submitButtonLabel}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              )}
            </div>
          </TranslatableField>
          <TranslatableField locale={activeLocale}>
            <div>
              <label className="block text-sm font-medium mb-1.5">Thank You Message</label>
              {activeLocale === 'en' ? (
                <input
                  type="text"
                  value={state.thankYouMessage}
                  onChange={(e) => onChange({ thankYouMessage: e.target.value })}
                  maxLength={200}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              ) : (
                <input
                  type="text"
                  value={getFeedbackTranslation(state, activeLocale, 'thankYouMessage')}
                  onChange={(e) => setFeedbackTranslation(state, onChange, activeLocale, 'thankYouMessage', e.target.value)}
                  maxLength={200}
                  placeholder={state.thankYouMessage}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              )}
            </div>
          </TranslatableField>
        </div>
      </section>

      {/* Status message */}
      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Save button */}
      <div className="sticky bottom-4 pt-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="w-full rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-elevated transition-all duration-200 hover:shadow-elevated-lg hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
          {saving ? 'Saving...' : 'Save Feedback Settings'}
        </button>
      </div>
    </div>
  );
}
