import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { I18nProvider } from '../../components/i18n-provider'
import {
  defaultLocale,
  getDir,
  hreflangByLocale,
  isLocale,
  localePath,
  locales,
  type Locale,
} from '../../lib/i18n'
import { siteUrl } from '../../lib/tools'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

// Build hreflang alternates for a given locale-agnostic path.
function languageAlternates(path = '/') {
  const languages: Record<string, string> = {}
  for (const locale of locales) {
    languages[hreflangByLocale[locale]] = `${siteUrl}${localePath(locale, path)}`
  }
  languages['x-default'] = `${siteUrl}${localePath(defaultLocale, path)}`
  return languages
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return {
    alternates: {
      canonical: localePath(locale, '/'),
      languages: languageAlternates('/'),
    },
    openGraph: {
      locale: hreflangByLocale[locale].replace('-', '_'),
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  return (
    <I18nProvider locale={locale as Locale} dir={getDir(locale as Locale)}>
      {children}
    </I18nProvider>
  )
}
