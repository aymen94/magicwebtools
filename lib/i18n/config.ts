// i18n configuration: supported locales, metadata and helpers.

export const locales = ['en', 'zh-CN', 'es', 'pt-BR', 'fr', 'de', 'ja', 'ko', 'it', 'ar'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const LOCALE_COOKIE = 'wdt-locale'

export type LocaleMeta = {
  code: Locale
  label: string        // Native name shown in the switcher
  englishName: string
  dir: 'ltr' | 'rtl'
}

export const localeMeta: Record<Locale, LocaleMeta> = {
  en: { code: 'en', label: 'English', englishName: 'English', dir: 'ltr' },
  'zh-CN': { code: 'zh-CN', label: '简体中文', englishName: 'Chinese (Simplified)', dir: 'ltr' },
  es: { code: 'es', label: 'Español', englishName: 'Spanish', dir: 'ltr' },
  'pt-BR': { code: 'pt-BR', label: 'Português (Brasil)', englishName: 'Portuguese (Brazil)', dir: 'ltr' },
  fr: { code: 'fr', label: 'Français', englishName: 'French', dir: 'ltr' },
  de: { code: 'de', label: 'Deutsch', englishName: 'German', dir: 'ltr' },
  ja: { code: 'ja', label: '日本語', englishName: 'Japanese', dir: 'ltr' },
  ko: { code: 'ko', label: '한국어', englishName: 'Korean', dir: 'ltr' },
  it: { code: 'it', label: 'Italiano', englishName: 'Italian', dir: 'ltr' },
  ar: { code: 'ar', label: 'العربية', englishName: 'Arabic', dir: 'rtl' },
}

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value)
}

export function getDir(locale: Locale): 'ltr' | 'rtl' {
  return localeMeta[locale].dir
}

// Resolve a browser Accept-Language / navigator.language value to a supported locale.
export function resolveLocale(candidate: string | undefined | null): Locale {
  if (!candidate) return defaultLocale
  if (isLocale(candidate)) return candidate
  const lower = candidate.toLowerCase()
  // Exact region match (e.g. pt-br -> pt-BR, zh-cn -> zh-CN).
  for (const locale of locales) {
    if (locale.toLowerCase() === lower) return locale
  }
  // Base-language match (e.g. pt -> pt-BR, zh -> zh-CN, en-GB -> en).
  const base = lower.split('-')[0]
  for (const locale of locales) {
    if (locale.toLowerCase().split('-')[0] === base) return locale
  }
  return defaultLocale
}
