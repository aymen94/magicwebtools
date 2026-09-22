'use client'

import { Globe } from 'lucide-react'
import { locales } from '../lib/i18n'
import { localeMeta, useI18n, useTranslations } from './i18n-provider'
import type { Locale } from '../lib/i18n'

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()
  const { dict } = useTranslations()

  return (
    <label className="language-switcher" title={dict.common.selectLanguage}>
      <Globe size={14} aria-hidden="true" />
      <span className="sr-only">{dict.common.selectLanguage}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        aria-label={dict.common.selectLanguage}
      >
        {locales.map((code) => (
          <option value={code} key={code}>{localeMeta[code].label}</option>
        ))}
      </select>
    </label>
  )
}
