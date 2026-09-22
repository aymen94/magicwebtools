import type { MetadataRoute } from 'next'
import { siteUrl } from '../lib/tools'

// Required for `output: 'export'` — pre-render this metadata route at build time.
export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Allow general search crawlers and AI agents to index and cite the tools.
      { userAgent: '*', allow: '/' },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
