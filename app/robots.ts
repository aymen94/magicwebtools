import type { MetadataRoute } from 'next'
import { siteUrl } from '../lib/tools'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Allow general search crawlers and AI agents to index and cite the tools.
      { userAgent: '*', allow: '/', disallow: ['/api/'] },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
