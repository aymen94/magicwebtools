'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  defaultLocale,
  getDir,
  getDictionary,
  isLocale,
  LOCALE_COOKIE,
  localeMeta,
  resolveLocale,
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

function readCookieLocale(): Locale | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`))
  const value = match ? decodeURIComponent(match[1]) : null
  return isLocale(value) ? value : null
}

function applyHtmlLang(locale: Locale) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale
  document.documentElement.dir = getDir(locale)
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Start from the default locale so server and first client render match,
  // then reconcile to the saved/browser locale after mount.
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)

  useEffect(() => {
    const saved = readCookieLocale()
    const initial = saved ?? resolveLocale(typeof navigator !== 'undefined' ? navigator.language : null)
    if (initial !== locale) setLocaleState(initial)
    applyHtmlLang(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    applyHtmlLang(next)
    if (typeof document !== 'undefined') {
      const oneYear = 60 * 60 * 24 * 365
      document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=${oneYear}; samesite=lax`
    }
  }, [])

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    dict: getDictionary(locale),
    dir: getDir(locale),
    setLocale,
  }), [locale, setLocale])

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
