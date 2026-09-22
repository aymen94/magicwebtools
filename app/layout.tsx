import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PwaRegister } from '../components/pwa-register'
import { I18nProvider } from '../components/i18n-provider'
import { PageTransition } from '../components/page-transition'
import { ClickRipple } from '../components/click-ripple'
import { siteUrl, tools, toolCategories } from '../lib/tools'

const description = 'magicwebtools is a collection of 900+ fast developer utilities — PDF tools, converters, text tools, generators, hash/encoders, and network checkers. 100% free and 100% privacy safe: all data is stored in your browser. We have no database and collect nothing. Every tool runs locally with no signup and no upload.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'magicwebtools — 900+ free browser tools for developers',
    template: '%s | magicwebtools',
  },
  description,
  applicationName: 'magicwebtools',
  keywords: [
    'developer tools', 'online tools', 'free tools', 'browser tools', 'privacy-first tools',
    'PDF tools', 'merge PDF', 'split PDF', 'compress PDF', 'PDF to JPG',
    'JSON formatter', 'base64 encoder', 'hash generator', 'UUID generator',
    'unit converter', 'text tools', 'DNS lookup', 'SSL checker', 'no signup tools',
  ],
  authors: [{ name: 'magicwebtools' }],
  creator: 'magicwebtools',
  publisher: 'magicwebtools',
  category: 'technology',
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  openGraph: {
    type: 'website',
    siteName: 'magicwebtools',
    url: siteUrl,
    title: 'magicwebtools — 900+ free browser tools for developers',
    description,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'magicwebtools — 900+ free browser tools for developers',
    description,
  },
  appleWebApp: { capable: true, title: 'magicwebtools', statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  themeColor: '#0b1016',
}

// Structured data helps search engines and AI agents understand and cite the site.
function StructuredData() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'magicwebtools',
      url: siteUrl,
      description,
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/tools?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'magicwebtools',
      url: siteUrl,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any (web browser)',
      browserRequirements: 'Requires a modern web browser. Works offline as a PWA.',
      description,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList: toolCategories.filter((item) => item !== 'All tools').join(', '),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'magicwebtools utilities',
      numberOfItems: tools.length,
      itemListElement: tools.slice(0, 100).map((tool, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: tool.name,
        url: `${siteUrl}${tool.href ?? `/tools/${tool.slug}`}`,
      })),
    },
  ]

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-paper text-ink font-display antialiased">
        <StructuredData />
        <PwaRegister />
        <ClickRipple />
        <I18nProvider>
          <PageTransition>{children}</PageTransition>
        </I18nProvider>
      </body>
    </html>
  )
}
