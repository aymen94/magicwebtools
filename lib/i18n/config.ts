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

// --- URL / routing helpers -------------------------------------------------

// Map an app locale to a BCP-47 value for hreflang / html lang attributes.
export const hreflangByLocale: Record<Locale, string> = {
  en: 'en',
  'zh-CN': 'zh-Hans',
  es: 'es',
  'pt-BR': 'pt-BR',
  fr: 'fr',
  de: 'de',
  ja: 'ja',
  ko: 'ko',
  it: 'it',
  ar: 'ar',
}

// Extract the locale from a pathname like `/fr/tools/foo`. Falls back to the
// default locale when the first segment is not a supported locale.
export function localeFromPathname(pathname: string | null | undefined): Locale {
  if (!pathname) return defaultLocale
  const segment = pathname.split('/').filter(Boolean)[0]
  return isLocale(segment) ? segment : defaultLocale
}

// Prefix a locale-agnostic path (e.g. `/tools/foo`) with a locale.
// `localePath('fr', '/tools')` -> `/fr/tools`; `localePath('en', '/')` -> `/en`.
export function localePath(locale: Locale, path = '/'): string {
  const clean = `/${path}`.replace(/\/{2,}/g, '/').replace(/\/$/, '')
  return clean ? `/${locale}${clean}` : `/${locale}`
}

// Strip a leading locale segment from a pathname, returning the locale-agnostic
// remainder (always starting with `/`). `/fr/tools/foo` -> `/tools/foo`.
export function stripLocale(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length && isLocale(parts[0])) parts.shift()
  return `/${parts.join('/')}`.replace(/\/$/, '') || '/'
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
