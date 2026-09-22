import type { Locale } from './config'
import { defaultLocale } from './config'
import { en, type Dictionary } from './dictionaries'
import zhCN from './locales/zh-CN'
import es from './locales/es'
import ptBR from './locales/pt-BR'
import fr from './locales/fr'
import de from './locales/de'
import ja from './locales/ja'
import ko from './locales/ko'
import it from './locales/it'
import ar from './locales/ar'

export const dictionaries: Record<Locale, Dictionary> = {
  en,
  'zh-CN': zhCN,
  es,
  'pt-BR': ptBR,
  fr,
  de,
  ja,
  ko,
  it,
  ar,
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale]
}

export type { Dictionary }
export * from './config'
