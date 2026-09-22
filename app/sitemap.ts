import type { MetadataRoute } from 'next'
import { siteUrl, tools } from '../lib/tools'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/tools`, lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/plugins`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
  ]

  const toolRoutes: MetadataRoute.Sitemap = tools.map((tool) => ({
    url: `${siteUrl}${tool.href ?? `/tools/${tool.slug}`}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: tool.category === 'PDF tools' ? 0.8 : 0.7,
  }))

  return [...staticRoutes, ...toolRoutes]
}
