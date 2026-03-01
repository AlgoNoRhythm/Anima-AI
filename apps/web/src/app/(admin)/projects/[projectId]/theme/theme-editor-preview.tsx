'use client';

import { FileText, ArrowUp } from 'lucide-react';
import { computeThemeVars } from '@anima-ai/shared';
import type { ThemeState } from './theme-editor-types';
import { MOCK_MESSAGES } from './theme-editor-types';

interface ThemeEditorPreviewProps {
  state: ThemeState;
  projectName: string;
}

export function ThemeEditorPreview({ state, projectName }: ThemeEditorPreviewProps) {
  // Compute CSS vars from the current state
  const cssVars = computeThemeVars({
    primaryColor: state.primaryColor,
    backgroundColor: state.backgroundColor,
    borderRadius: state.borderRadius,
  });

  const previewStyle: React.CSSProperties = {};
  const styleVars = previewStyle as Record<string, string>;
  for (const [key, value] of Object.entries(cssVars)) {
    if (key === 'colorScheme') {
      previewStyle.colorScheme = value;
    } else {
      styleVars[key] = value;
    }
  }
  if (state.fontFamily) {
    previewStyle.fontFamily = state.fontFamily;
  }

  const displayName = projectName;
  const showAvatar = state.showLogo && state.logoUrl;

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 overflow-hidden">
      {/* Decorative browser frame */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-b border-border/40">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
        </div>
        <span className="text-[10px] text-muted-foreground/60 ml-2">Live Preview</span>
      </div>

      {/* Mock chat UI — mirrors the clean chat design system */}
      <div
        className="flex flex-col"
        style={{ ...previewStyle, height: 520, background: 'hsl(var(--chat-bg))' }}
      >
        {/* Header — clean surface, thin border, no heavy shadows */}
        <div
          className="border-b px-3 py-2.5 flex items-center gap-2.5"
          style={{
            borderColor: 'hsl(var(--chat-border))',
            background: 'hsl(var(--chat-surface))',
          }}
        >
          {showAvatar ? (
            <img src={state.logoUrl!} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'hsl(var(--chat-accent) / 0.15)' }}
            >
              <div
                className="w-5 h-5 rounded-full"
                style={{ backgroundColor: 'hsl(var(--chat-accent))' }}
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium leading-tight truncate" style={{ color: 'hsl(var(--foreground))' }}>
              {displayName}
            </p>
            <p className="text-[10px]" style={{ color: 'hsl(var(--chat-muted))' }}>Powered by Anima AI</p>
          </div>
          {/* Action button preview */}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-medium shrink-0"
            style={{
              background: 'hsl(var(--chat-accent) / 0.1)',
              color: 'hsl(var(--chat-accent))',
            }}
          >
            {state.actionButtonLabel || 'Open PDF'}
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </div>
          {/* Refresh icon */}
          <div
            className="w-5 h-5 flex items-center justify-center rounded shrink-0"
            style={{ color: 'hsl(var(--chat-muted))' }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Welcome */}
          <div className="text-center py-4">
            {showAvatar ? (
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 overflow-hidden">
                <img src={state.logoUrl!} alt="" className="w-12 h-12 object-cover" />
              </div>
            ) : (
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-2"
                style={{ backgroundColor: 'hsl(var(--chat-accent) / 0.1)' }}
              >
                <div
                  className="w-7 h-7 rounded-full"
                  style={{ backgroundColor: 'hsl(var(--chat-accent))' }}
                />
              </div>
            )}
            <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
              {state.welcomeMessage}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--chat-muted))' }}>Ask me anything.</p>
          </div>

          {/* Mock messages */}
          {MOCK_MESSAGES.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Bot avatar */}
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 mt-0.5">
                  {showAvatar ? (
                    <img src={state.logoUrl!} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'hsl(var(--chat-accent) / 0.15)' }}
                    >
                      <div
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: 'hsl(var(--chat-accent))' }}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="max-w-[75%]">
                <div
                  className="px-3 py-2 text-xs leading-[1.5]"
                  style={{
                    borderRadius: msg.role === 'user'
                      ? '16px 16px 4px 16px'
                      : '16px 16px 16px 4px',
                    ...(msg.role === 'user'
                      ? {
                          background: 'hsl(var(--chat-user))',
                          color: 'hsl(var(--chat-user-fg))',
                        }
                      : {
                          background: 'hsl(var(--chat-assistant))',
                          color: 'hsl(var(--foreground))',
                        }),
                  }}
                >
                  <p>{msg.content}</p>
                  {'citation' in msg && msg.citation && (
                    <div className="mt-1.5 pt-1.5" style={{ borderTop: '1px solid hsl(var(--foreground) / 0.08)' }}>
                      <div
                        className="flex items-center gap-1.5 text-[10px] p-1.5 rounded-md"
                        style={{
                          background: 'hsl(var(--chat-surface) / 0.6)',
                          border: '1px solid hsl(var(--chat-border))',
                        }}
                      >
                        <FileText className="w-3 h-3 flex-shrink-0" style={{ color: 'hsl(var(--chat-accent))' }} />
                        <span>
                          <span className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>{msg.citation.title}</span>
                          <span style={{ color: 'hsl(var(--chat-muted))' }}> - p. {msg.citation.page}</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input bar — surface bg, thin border, send button integrated */}
        <div
          className="p-2"
          style={{
            background: 'hsl(var(--chat-surface))',
            borderTop: '1px solid hsl(var(--chat-border))',
          }}
        >
          <div className="relative">
            <div
              className="h-9 px-3 pr-9 flex items-center text-[10px] rounded-full"
              style={{
                border: '1px solid hsl(var(--chat-border))',
                background: 'hsl(var(--chat-bg))',
                color: 'hsl(var(--chat-muted))',
              }}
            >
              Type your message...
            </div>
            <div
              className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full"
              style={{
                background: 'hsl(var(--chat-accent))',
                color: 'hsl(var(--chat-accent-fg))',
              }}
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="py-1 text-center" style={{ background: 'hsl(var(--chat-surface))' }}>
          <p className="text-[8px]" style={{ color: 'hsl(var(--chat-muted) / 0.6)' }}>
            Powered by <span className="font-medium">Anima AI</span>
          </p>
        </div>
      </div>
    </div>
  );
}
