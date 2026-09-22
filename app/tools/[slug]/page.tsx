import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ToolWorkbench } from '../../../components/tool-workbench'
import { getTool, siteUrl, tools } from '../../../lib/tools'

export function generateStaticParams() {
  return tools.filter((tool) => !tool.href).map((tool) => ({ slug: tool.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const tool = getTool(slug)
  if (!tool || tool.href) return {}

  const title = `${tool.name} — free online tool`
  const description = `${tool.description} Runs privately in your browser with no signup and no upload. Part of magicwebtools' ${tool.category.toLowerCase()}.`
  const url = `${siteUrl}/tools/${tool.slug}`

  return {
    title,
    description,
    alternates: { canonical: `/tools/${tool.slug}` },
    openGraph: { type: 'website', url, title: `${tool.name} | magicwebtools`, description, siteName: 'magicwebtools' },
    twitter: { card: 'summary_large_image', title: `${tool.name} | magicwebtools`, description },
  }
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tool = getTool(slug)
  if (!tool || tool.href) notFound()

  const url = `${siteUrl}/tools/${tool.slug}`
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
        { '@type': 'ListItem', position: 1, name: 'magicwebtools', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: 'All tools', item: `${siteUrl}/tools` },
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