import type { MetadataRoute } from 'next'

// Required for `output: 'export'` — pre-render this metadata route at build time.
export const dynamic = 'force-static'

// PWA plugin: app manifest that makes the whole site installable.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'magicwebtools',
    short_name: 'magicwebtools',
    description: '900+ free developer tools. 100% privacy safe — all data is stored in your browser. No database, no data collection.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0b1016',
    theme_color: '#0b1016',
    orientation: 'any',
    icons: [
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icons/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}
