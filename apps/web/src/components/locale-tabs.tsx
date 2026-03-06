'use client';

import { SUPPORTED_LOCALES, LOCALE_LABELS } from '@/lib/locale/types';
import type { SupportedLocale } from '@/lib/locale/types';

interface LocaleTabsProps {
  activeLocale: SupportedLocale;
  onChange: (locale: SupportedLocale) => void;
}

export function LocaleTabs({ activeLocale, onChange }: LocaleTabsProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-muted/50 p-1">
      {SUPPORTED_LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => onChange(locale)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
            activeLocale === locale
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {LOCALE_LABELS[locale]}
        </button>
      ))}
    </div>
  );
}
