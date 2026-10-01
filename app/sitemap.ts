import type { MetadataRoute } from 'next'
import { siteUrl, tools } from '../lib/tools'
import { defaultLocale, hreflangByLocale, localePath, locales } from '../lib/i18n'

// Required for `output: 'export'` — pre-render this metadata route at build time.
export const dynamic = 'force-static'

// Locale-agnostic paths that exist for every language.
const staticPaths: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/tools', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/extensions', changeFrequency: 'monthly', priority: 0.5 },
]

// hreflang alternates for a locale-agnostic path.
function alternates(path: string) {
  const languages: Record<string, string> = {}
  for (const locale of locales) {
    languages[hreflangByLocale[locale]] = `${siteUrl}${localePath(locale, path)}`
  }
  languages['x-default'] = `${siteUrl}${localePath(defaultLocale, path)}`
  return { languages }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  const entries: MetadataRoute.Sitemap = []

  const toolPaths = tools.map((tool) => ({
    path: tool.href ?? `/tools/${tool.slug}`,
    changeFrequency: 'monthly' as const,
    priority: tool.category === 'PDF tools' ? 0.8 : 0.7,
  }))

  for (const { path, changeFrequency, priority } of [...staticPaths, ...toolPaths]) {
    for (const locale of locales) {
      entries.push({
        url: `${siteUrl}${localePath(locale, path)}`,
        lastModified,
        changeFrequency,
        priority,
        alternates: alternates(path),
      })
    }
  }

  return entries
}
