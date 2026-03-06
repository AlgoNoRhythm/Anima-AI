'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { updatePersonality } from '@/lib/actions/personality';
import { MODEL_OPTIONS, DEFAULT_MODEL_PROVIDER, DEFAULT_MODEL_NAME } from '@anima-ai/shared';
import { LocaleTabs } from '@/components/locale-tabs';
import { TranslatableField } from '@/components/translatable-field';
import type { SupportedLocale, TranslationsMap, PersonalityTranslations } from '@/lib/locale/types';

interface PersonalityFormProps {
  projectId: string;
  personality: {
    name: string;
    systemPrompt: string;
    tone: string;
    temperature: number;
    modelProvider: string;
    modelName: string;
    guardrails: {
      blockedTopics?: string[];
      maxResponseLength?: number;
      requireCitations?: boolean;
      allowOffTopic?: boolean;
      customInstructions?: string | null;
    };
    showDisclaimer: boolean;
    disclaimerText: string;
    translations?: TranslationsMap<PersonalityTranslations>;
  } | null;
  apiKeyStatus?: { openai: boolean; anthropic: boolean };
}

export function PersonalityForm({ projectId, personality, apiKeyStatus }: PersonalityFormProps) {
  const [name, setName] = useState(personality?.name ?? '');
  const [systemPrompt, setSystemPrompt] = useState(personality?.systemPrompt ?? '');
  const [tone, setTone] = useState(personality?.tone ?? 'professional');
  const [temperature, setTemperature] = useState(personality?.temperature ?? 0.7);
  const [modelProvider, setModelProvider] = useState(personality?.modelProvider ?? DEFAULT_MODEL_PROVIDER);
  const [modelName, setModelName] = useState(personality?.modelName ?? DEFAULT_MODEL_NAME);
  const [requireCitations, setRequireCitations] = useState(
    personality?.guardrails?.requireCitations ?? false,
  );
  const [allowOffTopic, setAllowOffTopic] = useState(
    personality?.guardrails?.allowOffTopic ?? false,
  );
  const [maxResponseLength, setMaxResponseLength] = useState(
    personality?.guardrails?.maxResponseLength ?? 2048,
  );
  const [showDisclaimer, setShowDisclaimer] = useState(
    personality?.showDisclaimer ?? true,
  );
  const [disclaimerText, setDisclaimerText] = useState(
    personality?.disclaimerText ?? 'AI-generated responses may contain inaccuracies. Please verify important information.',
  );

  const [translations, setTranslations] = useState<TranslationsMap<PersonalityTranslations>>(
    personality?.translations ?? {},
  );
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>('en');

  function getPersonalityTranslation(field: keyof PersonalityTranslations): string {
    if (activeLocale === 'en') return '';
    return (translations[activeLocale]?.[field] as string | undefined) ?? '';
  }

  function setPersonalityTranslation(field: keyof PersonalityTranslations, value: string) {
    if (activeLocale === 'en') return;
    const current = translations[activeLocale] ?? {};
    setTranslations((prev) => ({
      ...prev,
      [activeLocale]: { ...current, [field]: value },
    }));
  }

  const [blockedTopics, setBlockedTopics] = useState<string[]>(
    personality?.guardrails?.blockedTopics ?? [],
  );
  const [blockedTopicInput, setBlockedTopicInput] = useState('');
  const blockedTopicInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function addBlockedTopic() {
    const topic = blockedTopicInput.trim();
    if (topic && !blockedTopics.includes(topic)) {
      setBlockedTopics((prev) => [...prev, topic]);
    }
    setBlockedTopicInput('');
    blockedTopicInputRef.current?.focus();
  }

  function removeBlockedTopic(topic: string) {
    setBlockedTopics((prev) => prev.filter((t) => t !== topic));
  }

  function handleBlockedTopicKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addBlockedTopic();
    }
  }

  function handleProviderChange(provider: string) {
    setModelProvider(provider);
    const firstModel = MODEL_OPTIONS[provider]?.[0];
    if (firstModel) {
      setModelName(firstModel.value);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const result = await updatePersonality(projectId, {
        name,
        systemPrompt,
        tone,
        temperature,
        modelProvider,
        modelName,
        guardrails: {
          requireCitations,
          allowOffTopic,
          maxResponseLength,
          blockedTopics,
        },
        showDisclaimer,
        disclaimerText,
        translations,
      });

      if (result.success) {
        setMessage({ type: 'success', text: 'Personality settings saved successfully.' });
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Failed to save personality settings.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:shadow-elevated';

  const selectClass =
    'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  const textareaClass =
    'flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:shadow-elevated font-mono';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Locale tabs */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2">Translation Language</label>
        <LocaleTabs activeLocale={activeLocale} onChange={setActiveLocale} />
      </div>

      {/* Name */}
      <TranslatableField locale={activeLocale}>
        <div>
          <label htmlFor="personality-name" className="block text-sm font-medium mb-2">
            Name
          </label>
          {activeLocale === 'en' ? (
            <input
              id="personality-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Friendly Assistant"
              required
            />
          ) : (
            <input
              id="personality-name"
              type="text"
              value={getPersonalityTranslation('name')}
              onChange={(e) => setPersonalityTranslation('name', e.target.value)}
              className={inputClass}
              placeholder={name}
            />
          )}
          <p className="text-xs text-muted-foreground mt-2">
            A descriptive name for this personality configuration.
          </p>
        </div>
      </TranslatableField>

      {/* System Prompt */}
      <div>
        <label htmlFor="system-prompt" className="block text-sm font-medium mb-2">
          System Prompt
        </label>
        <textarea
          id="system-prompt"
          rows={6}
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className={textareaClass}
          placeholder="You are a helpful assistant..."
        />
        <p className="text-xs text-muted-foreground mt-2">
          Define the core behavior and personality of your chatbot.
        </p>
      </div>

      {/* Tone & Temperature */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="tone" className="block text-sm font-medium mb-2">
            Tone
          </label>
          <select
            id="tone"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className={selectClass}
          >
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="casual">Casual</option>
            <option value="formal">Formal</option>
            <option value="technical">Technical</option>
          </select>
        </div>
        <div>
          <label htmlFor="temperature" className="block text-sm font-medium mb-2">
            Temperature
          </label>
          <div className="flex items-center gap-3">
            <input
              id="temperature"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="flex-1 accent-gold"
            />
            <span className="text-sm font-mono text-muted-foreground w-8">
              {temperature.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Model Configuration */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-semibold mb-4">Model Configuration</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="model-provider" className="block text-sm font-medium mb-2">
              Provider
            </label>
            <select
              id="model-provider"
              value={modelProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className={selectClass}
            >
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>
          <div>
            <label htmlFor="model-name" className="block text-sm font-medium mb-2">
              Model
            </label>
            <select
              id="model-name"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className={selectClass}
            >
              {(MODEL_OPTIONS[modelProvider] ?? []).map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {apiKeyStatus && (
          <div className="mt-3">
            {apiKeyStatus[modelProvider as 'openai' | 'anthropic'] ? (
              <p className="text-xs text-green-700 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                {modelProvider === 'openai' ? 'OpenAI' : 'Anthropic'} API key configured
              </p>
            ) : (
              <p className="text-xs text-amber-700 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                {modelProvider === 'openai' ? 'OpenAI' : 'Anthropic'} API key not set &mdash;{' '}
                <a href="/settings" className="underline font-medium hover:text-amber-900">add in Settings</a>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Guardrails */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-semibold mb-4">Guardrails</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={requireCitations}
              onChange={(e) => setRequireCitations(e.target.checked)}
              className="w-4 h-4 rounded border-input accent-gold"
            />
            <div>
              <p className="text-sm font-medium">Require citations</p>
              <p className="text-xs text-muted-foreground">
                Force the chatbot to cite source documents in responses.
              </p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={allowOffTopic}
              onChange={(e) => setAllowOffTopic(e.target.checked)}
              className="w-4 h-4 rounded border-input accent-gold"
            />
            <div>
              <p className="text-sm font-medium">Allow off-topic</p>
              <p className="text-xs text-muted-foreground">
                Allow the chatbot to respond to questions outside the uploaded documents.
              </p>
            </div>
          </label>
          <div>
            <label htmlFor="max-response-length" className="block text-sm font-medium mb-2">
              Max Response Length (tokens)
            </label>
            <input
              id="max-response-length"
              type="number"
              min={1}
              max={4096}
              value={maxResponseLength}
              onChange={(e) => setMaxResponseLength(parseInt(e.target.value, 10) || 0)}
              className={inputClass}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Maximum number of tokens the chatbot can use in a single response.
            </p>
          </div>
          <div>
            <p className="block text-sm font-medium mb-2">Blocked Topics</p>
            {blockedTopics.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {blockedTopics.map((topic) => (
                  <span
                    key={topic}
                    className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium"
                  >
                    {topic}
                    <button
                      type="button"
                      onClick={() => removeBlockedTopic(topic)}
                      aria-label={`Remove blocked topic: ${topic}`}
                      className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="w-3 h-3"
                        aria-hidden="true"
                      >
                        <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={blockedTopicInputRef}
                id="blocked-topic-input"
                type="text"
                value={blockedTopicInput}
                onChange={(e) => setBlockedTopicInput(e.target.value)}
                onKeyDown={handleBlockedTopicKeyDown}
                placeholder="e.g. politics, competitor names"
                className={inputClass}
              />
              <button
                type="button"
                onClick={addBlockedTopic}
                disabled={!blockedTopicInput.trim()}
                className="shrink-0 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200 hover:bg-muted disabled:opacity-50 disabled:pointer-events-none"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              The chatbot will refuse to discuss these topics. Press Enter or click Add to add a topic.
            </p>
          </div>
        </div>
      </div>

      {/* AI Disclaimer */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-semibold mb-4">AI Disclaimer</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={showDisclaimer}
              onChange={(e) => setShowDisclaimer(e.target.checked)}
              className="w-4 h-4 rounded border-input accent-gold"
            />
            <div>
              <p className="text-sm font-medium">Show AI disclaimer to users</p>
              <p className="text-xs text-muted-foreground">
                Display a dismissible banner on the public chat page warning that AI responses may be inaccurate.
              </p>
            </div>
          </label>
          {showDisclaimer && (
            <TranslatableField locale={activeLocale}>
              <div>
                <label htmlFor="disclaimer-text" className="block text-sm font-medium mb-2">
                  Disclaimer Text
                </label>
                {activeLocale === 'en' ? (
                  <input
                    id="disclaimer-text"
                    type="text"
                    value={disclaimerText}
                    onChange={(e) => setDisclaimerText(e.target.value)}
                    className={inputClass}
                    placeholder="AI-generated responses may contain inaccuracies."
                    maxLength={500}
                  />
                ) : (
                  <input
                    id="disclaimer-text"
                    type="text"
                    value={getPersonalityTranslation('disclaimerText')}
                    onChange={(e) => setPersonalityTranslation('disclaimerText', e.target.value)}
                    className={inputClass}
                    placeholder={disclaimerText}
                    maxLength={500}
                  />
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Customize the disclaimer message shown to users. Max 500 characters.
                </p>
              </div>
            </TranslatableField>
          )}
        </div>
      </div>

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

      {/* Submit */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-elevated transition-all duration-200 hover:shadow-elevated-lg hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
          {saving ? 'Saving...' : 'Save Personality'}
        </button>
      </div>
    </form>
  );
}
