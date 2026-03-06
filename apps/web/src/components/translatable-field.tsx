'use client';

import type { SupportedLocale } from '@/lib/locale/types';

interface TranslatableFieldProps {
  locale: SupportedLocale;
  children: React.ReactNode;
}

export function TranslatableField({ locale, children }: TranslatableFieldProps) {
  if (locale === 'en') {
    return <>{children}</>;
  }

  return (
    <div className="border-l-2 border-blue-400/50 pl-6 relative">
      <span className="absolute left-1.5 top-0.5 text-blue-400/60" title="Translated field">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.264.26-2.466.732-3.558" />
        </svg>
      </span>
      {children}
    </div>
  );
}
