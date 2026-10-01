import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ToolWorkbench } from '../../../../components/tool-workbench'
import { getTool, siteUrl, tools } from '../../../../lib/tools'
import { hreflangByLocale, isLocale, localePath, locales, defaultLocale } from '../../../../lib/i18n'

export function generateStaticParams() {
  return tools.filter((tool) => !tool.href).map((tool) => ({ slug: tool.slug }))
}

function languageAlternates(path: string) {
  const languages: Record<string, string> = {}
  for (const locale of locales) {
    languages[hreflangByLocale[locale]] = `${siteUrl}${localePath(locale, path)}`
  }
  languages['x-default'] = `${siteUrl}${localePath(defaultLocale, path)}`
  return languages
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params
  const tool = getTool(slug)
  if (!tool || tool.href || !isLocale(locale)) return {}

  const path = `/tools/${tool.slug}`
  const title = `${tool.name} — free online tool`
  const description = `${tool.description} Runs privately in your browser with no signup and no upload. Part of magicwebtools' ${tool.category.toLowerCase()}.`
  const url = `${siteUrl}${localePath(locale, path)}`

  return {
    title,
    description,
    alternates: { canonical: localePath(locale, path), languages: languageAlternates(path) },
    openGraph: { type: 'website', url, title: `${tool.name} | magicwebtools`, description, siteName: 'magicwebtools' },
    twitter: { card: 'summary_large_image', title: `${tool.name} | magicwebtools`, description },
  }
}

export default async function ToolPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  const tool = getTool(slug)
  if (!tool || tool.href || !isLocale(locale)) notFound()

  const url = `${siteUrl}${localePath(locale, `/tools/${tool.slug}`)}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.name,
    url,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any (web browser)',
    description: tool.description,
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: 'magicwebtools', url: siteUrl },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'magicwebtools', item: `${siteUrl}${localePath(locale, '/')}` },
        { '@type': 'ListItem', position: 2, name: 'All tools', item: `${siteUrl}${localePath(locale, '/tools')}` },
        { '@type': 'ListItem', position: 3, name: tool.name, item: url },
      ],
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ToolWorkbench tool={tool} />
    </>
  )
}
