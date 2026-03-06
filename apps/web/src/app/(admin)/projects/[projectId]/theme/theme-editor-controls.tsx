'use client';

import { useRef, useState } from 'react';
import type { ThemeState } from './theme-editor-types';
import { FONT_OPTIONS } from './theme-editor-types';
import { LocaleTabs } from '@/components/locale-tabs';
import { TranslatableField } from '@/components/translatable-field';
import type { SupportedLocale, ThemeTranslations } from '@/lib/locale/types';

interface ThemeEditorControlsProps {
  state: ThemeState;
  onChange: (partial: Partial<ThemeState>) => void;
  projectId: string;
  saving: boolean;
  onSave: () => void;
  message: { type: 'success' | 'error'; text: string } | null;
}

const COLOR_PRESETS = [
  '#eab308', '#f59e0b', '#f97316', '#ef4444',
  '#ec4899', '#a855f7', '#8b5cf6', '#6366f1',
  '#2563eb', '#0ea5e9', '#06b6d4', '#0891b2',
  '#10b981', '#22c55e', '#64748b', '#1e293b',
];

function ColorPicker({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const nativeRef = useRef<HTMLInputElement>(null);
  const [hexInput, setHexInput] = useState(value);

  // Keep local hex input in sync when parent value changes (e.g. swatch click)
  const prevValue = useRef(value);
  if (prevValue.current !== value) {
    prevValue.current = value;
    setHexInput(value);
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <p className="text-xs text-muted-foreground mb-2">{description}</p>

      {/* Swatch grid */}
      <div className="grid grid-cols-8 gap-1.5 mb-3">
        {COLOR_PRESETS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className="group relative w-full aspect-square rounded-md border-2 transition-all duration-150 hover:scale-110"
            style={{
              backgroundColor: color,
              borderColor: value.toLowerCase() === color.toLowerCase()
                ? 'hsl(var(--foreground))'
                : 'transparent',
            }}
            title={color}
          >
            {value.toLowerCase() === color.toLowerCase() && (
              <svg
                className="absolute inset-0 m-auto w-3 h-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isLightColor(color) ? '#000' : '#fff'}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
          </button>
        ))}
      </div>

      {/* Hex input + custom picker */}
      <div className="flex items-center gap-2">
        <div
          className="w-9 h-9 rounded-lg border border-border shadow-sm flex-shrink-0"
          style={{ backgroundColor: value }}
        />
        <input
          type="text"
          value={hexInput}
          onChange={(e) => {
            const v = e.target.value;
            setHexInput(v);
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
          }}
          onBlur={() => {
            if (!/^#[0-9a-fA-F]{6}$/.test(hexInput)) setHexInput(value);
          }}
          className="h-9 w-24 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm font-mono shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          maxLength={7}
          placeholder="#000000"
        />
        <button
          type="button"
          onClick={() => nativeRef.current?.click()}
          className="h-9 rounded-lg border border-input bg-background px-3 text-xs text-muted-foreground shadow-sm transition-all duration-200 hover:bg-accent hover:text-foreground"
        >
          Custom
        </button>
        <input
          ref={nativeRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
      </div>
    </div>
  );
}

function SuggestedQuestionsEditor({
  questions,
  onChange,
}: {
  questions: string[];
  onChange: (questions: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  function addQuestion() {
    const trimmed = draft.trim();
    if (!trimmed || questions.length >= 6) return;
    onChange([...questions, trimmed]);
    setDraft('');
  }

  function removeQuestion(index: number) {
    onChange(questions.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {questions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {questions.map((q, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-sm"
            >
              <span className="max-w-[200px] truncate">{q}</span>
              <button
                type="button"
                onClick={() => removeQuestion(i)}
                className="inline-flex items-center justify-center w-4 h-4 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label={`Remove "${q}"`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
      {questions.length < 6 && (
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addQuestion();
              }
            }}
            maxLength={200}
            placeholder="e.g. How do I get started?"
            className="flex-1 h-9 rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={addQuestion}
            disabled={!draft.trim()}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium shadow-sm transition-all duration-200 hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return false;
  const r = parseInt(m[1]!, 16);
  const g = parseInt(m[2]!, 16);
  const b = parseInt(m[3]!, 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

function getTranslation<K extends keyof ThemeTranslations>(
  state: ThemeState,
  locale: SupportedLocale,
  field: K,
): ThemeTranslations[K] | undefined {
  if (locale === 'en') return undefined;
  return state.translations[locale]?.[field];
}

function setTranslation<K extends keyof ThemeTranslations>(
  state: ThemeState,
  onChange: (partial: Partial<ThemeState>) => void,
  locale: SupportedLocale,
  field: K,
  value: ThemeTranslations[K],
) {
  if (locale === 'en') return;
  const current = state.translations[locale] ?? {};
  onChange({
    translations: {
      ...state.translations,
      [locale]: { ...current, [field]: value },
    },
  });
}

export function ThemeEditorControls({
  state,
  onChange,
  projectId,
  saving,
  onSave,
  message,
}: ThemeEditorControlsProps) {
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>('en');

  return (
    <div className="space-y-8">
      {/* Locale tabs */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2">Translation Language</label>
        <LocaleTabs activeLocale={activeLocale} onChange={setActiveLocale} />
      </div>

      {/* Colors */}
      <section>
        <h3 className="text-sm font-semibold mb-4">Colors</h3>
        <div className="space-y-6">
          <ColorPicker
            label="Primary Color"
            description="User bubbles, send button, accent highlights"
            value={state.primaryColor}
            onChange={(v) => onChange({ primaryColor: v })}
          />
          <ColorPicker
            label="Background Color"
            description="Chat page background (light or dark)"
            value={state.backgroundColor}
            onChange={(v) => onChange({ backgroundColor: v })}
          />
        </div>
      </section>

      {/* Typography */}
      <section className="border-t pt-6">
        <h3 className="text-sm font-semibold mb-4">Typography</h3>
        <div className="grid grid-cols-2 gap-2">
          {FONT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ fontFamily: opt.value })}
              className={`text-left rounded-lg border px-3 py-2.5 text-sm transition-all duration-200 ${
                state.fontFamily === opt.value
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-primary/30 hover:bg-accent/50'
              }`}
              style={{ fontFamily: opt.value }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Branding */}
      <section className="border-t pt-6">
        <h3 className="text-sm font-semibold mb-4">Branding</h3>
        <div className="space-y-4">
          {/* Avatar upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Chatbot Avatar</label>
            <div className="flex items-center gap-4">
              {state.logoUrl ? (
                <img src={state.logoUrl} alt="Avatar preview" className="w-14 h-14 rounded-lg object-cover border" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs">
                  No image
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) return;
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                      const res = await fetch(`/api/projects/${projectId}/avatar`, {
                        method: 'POST',
                        body: formData,
                      });
                      if (!res.ok) return;
                      const body = await res.json() as { url: string };
                      onChange({ logoUrl: body.url, showLogo: true });
                    } catch {
                      // Upload failed silently
                    }
                  }}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm file:border-0 file:bg-transparent file:text-sm file:font-medium cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP or SVG. Max 2MB.</p>
              </div>
            </div>
            {state.logoUrl && (
              <button
                type="button"
                onClick={() => onChange({ logoUrl: null, showLogo: false })}
                className="mt-2 text-xs text-destructive hover:underline"
              >
                Remove avatar
              </button>
            )}
          </div>

          {/* Show logo toggle */}
          {state.logoUrl && (
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={state.showLogo}
                  onChange={(e) => onChange({ showLogo: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-muted rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
              </div>
              <span className="text-sm">Show avatar in chat</span>
            </label>
          )}

          {/* Welcome message */}
          <TranslatableField locale={activeLocale}>
            <div>
              <label className="block text-sm font-medium mb-2">Welcome Message</label>
              {activeLocale === 'en' ? (
                <textarea
                  rows={2}
                  value={state.welcomeMessage}
                  onChange={(e) => onChange({ welcomeMessage: e.target.value })}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              ) : (
                <textarea
                  rows={2}
                  value={getTranslation(state, activeLocale, 'welcomeMessage') ?? ''}
                  onChange={(e) => setTranslation(state, onChange, activeLocale, 'welcomeMessage', e.target.value)}
                  placeholder={state.welcomeMessage}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              )}
            </div>
          </TranslatableField>

          {/* Action button label */}
          <TranslatableField locale={activeLocale}>
            <div>
              <label className="block text-sm font-medium mb-1.5">Action Button Label</label>
              <p className="text-xs text-muted-foreground mb-2">Shown in the header when documents are available (e.g. &quot;Open PDF&quot;, &quot;Manual&quot;, &quot;Menu&quot;).</p>
              {activeLocale === 'en' ? (
                <input
                  type="text"
                  value={state.actionButtonLabel}
                  onChange={(e) => onChange({ actionButtonLabel: e.target.value })}
                  maxLength={50}
                  placeholder="Open PDF"
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              ) : (
                <input
                  type="text"
                  value={getTranslation(state, activeLocale, 'actionButtonLabel') ?? ''}
                  onChange={(e) => setTranslation(state, onChange, activeLocale, 'actionButtonLabel', e.target.value)}
                  maxLength={50}
                  placeholder={state.actionButtonLabel}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              )}
            </div>
          </TranslatableField>
        </div>
      </section>

      {/* Suggested Questions */}
      <section className="border-t pt-6">
        <h3 className="text-sm font-semibold mb-4">Suggested Questions</h3>
        <p className="text-xs text-muted-foreground mb-3">Starter questions shown as pill chips in the welcome state. Max 6.</p>
        {activeLocale === 'en' ? (
          <SuggestedQuestionsEditor
            questions={state.suggestedQuestions}
            onChange={(questions) => onChange({ suggestedQuestions: questions })}
          />
        ) : (
          <TranslatableField locale={activeLocale}>
            <SuggestedQuestionsEditor
              questions={getTranslation(state, activeLocale, 'suggestedQuestions') ?? []}
              onChange={(questions) => setTranslation(state, onChange, activeLocale, 'suggestedQuestions', questions)}
            />
            {state.suggestedQuestions.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                English: {state.suggestedQuestions.join(' / ')}
              </p>
            )}
          </TranslatableField>
        )}
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

      {/* Save button — sticky on desktop */}
      <div className="sticky bottom-4 pt-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="w-full rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-elevated transition-all duration-200 hover:shadow-elevated-lg hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
          {saving ? 'Saving...' : 'Save Theme'}
        </button>
      </div>
    </div>
  );
}
