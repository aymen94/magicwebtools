'use client'

import { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  defaultLocale,
  getDir,
  getDictionary,
  localePath,
  LOCALE_COOKIE,
  localeMeta,
  stripLocale,
  type Dictionary,
  type Locale,
} from '../lib/i18n'

type I18nContextValue = {
  locale: Locale
  dict: Dictionary
  dir: 'ltr' | 'rtl'
  setLocale: (locale: Locale) => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

function applyHtmlLang(locale: Locale) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale
  document.documentElement.dir = getDir(locale)
}

export function I18nProvider({
  children,
  locale,
  dir,
}: {
  children: React.ReactNode
  locale: Locale
  dir: 'ltr' | 'rtl'
}) {
  const router = useRouter()
  const pathname = usePathname()

  // Keep <html lang/dir> and the persisted locale in sync with the active
  // route locale, which the server layout resolved from the URL.
  useEffect(() => {
    applyHtmlLang(locale)
    if (typeof document !== 'undefined') {
      const oneYear = 60 * 60 * 24 * 365
      document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)}; path=/; max-age=${oneYear}; samesite=lax`
    }
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    // Navigate to the same page under the new locale prefix.
    const rest = stripLocale(pathname ?? '/')
    router.push(localePath(next, rest))
  }, [router, pathname])

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    dict: getDictionary(locale),
    dir,
    setLocale,
  }), [locale, dir, setLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) {
    // Fallback keeps components usable outside the provider (e.g. tests).
    return { locale: defaultLocale, dict: getDictionary(defaultLocale), dir: 'ltr', setLocale: () => {} }
  }
  return context
}

// Convenience: interpolate {count}-style placeholders.
export function useTranslations() {
  const { dict } = useI18n()
  const format = useCallback((template: string, vars?: Record<string, string | number>) => {
    if (!vars) return template
    return template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match))
  }, [])
  return { dict, format }
}

export { localeMeta }

// Convenience hook for building locale-aware hrefs inside client components.
export function useLocalePath() {
  const { locale } = useI18n()
  return useCallback((path = '/') => localePath(locale, path), [locale])
}
