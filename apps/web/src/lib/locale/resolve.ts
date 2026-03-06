import { headers } from 'next/headers';
import type { SupportedLocale, ChatUITranslations } from './types';
import { SUPPORTED_LOCALES } from './types';
import en from './en.json';
import de from './de.json';
import fr from './fr.json';
import it from './it.json';

const translationMap: Record<SupportedLocale, ChatUITranslations> = {
  en: en as ChatUITranslations,
  de: de as ChatUITranslations,
  fr: fr as ChatUITranslations,
  it: it as ChatUITranslations,
};

function isSupported(locale: string): locale is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

/**
 * Resolve the locale from searchParams (?lang=xx) or Accept-Language header.
 * Falls back to 'en'.
 */
export async function resolveLocale(
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>,
): Promise<SupportedLocale> {
  const params = await searchParams;
  const langParam = typeof params.lang === 'string' ? params.lang.toLowerCase() : undefined;
  if (langParam && isSupported(langParam)) return langParam;

  // Parse Accept-Language header
  try {
    const headerStore = await headers();
    const acceptLang = headerStore.get('accept-language');
    if (acceptLang) {
      const locales = acceptLang
        .split(',')
        .map((part) => {
          const [lang, q] = part.trim().split(';q=');
          return { lang: lang!.trim().split('-')[0]!.toLowerCase(), q: q ? parseFloat(q) : 1 };
        })
        .sort((a, b) => b.q - a.q);

      for (const { lang } of locales) {
        if (isSupported(lang)) return lang;
      }
    }
  } catch {
    // headers() may fail in some contexts
  }

  return 'en';
}

/** Get static UI translations for a locale. */
export function getUITranslations(locale: SupportedLocale): ChatUITranslations {
  return translationMap[locale];
}

/**
 * Resolve a translatable DB field. Returns the translated value if available,
 * otherwise falls back to the English (default) value.
 */
export function resolveField<T>(
  englishValue: T,
  translationsMap: Record<string, Record<string, unknown>> | null | undefined,
  locale: SupportedLocale,
  fieldName: string,
): T {
  if (locale === 'en' || !translationsMap) return englishValue;
  const localeData = translationsMap[locale];
  if (!localeData) return englishValue;
  const translated = localeData[fieldName];
  if (translated === undefined || translated === null || translated === '') return englishValue;
  return translated as T;
}
