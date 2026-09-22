// Native Next.js port of the PHP plugin registry (plugins/*/config.php).
// Each entry mirrors the original plugin metadata and points at its native route.

export type PluginDefinition = {
  id: string
  name: string
  description: string
  icon: string
  version: string
  route: string
  gradient: string
  status: 'native' | 'hybrid'
}

export const plugins: PluginDefinition[] = [
  {
    id: 'pwa',
    name: 'PWA system',
    description: 'Makes the whole site installable and PWA compatible with an app manifest, offline caching, and an install prompt.',
    icon: '🚀',
    version: '4.0.0',
    route: '/plugins/pwa',
    gradient: 'linear-gradient(to bottom left, #ff936a, #ff15c1)',
    status: 'native',
  },
  {
    id: 'push-notifications',
    name: 'Push Notifications system',
    description: 'Subscribe visitors and send them web push notifications with ease.',
    icon: '🔔',
    version: '2.0.0',
    route: '/plugins/push-notifications',
    gradient: 'linear-gradient(to right, #3c1053, #ad5389)',
    status: 'hybrid',
  },
  {
    id: 'image-optimizer',
    name: 'Image optimizer',
    description: 'Compress and reduce the size of image uploads for better performance and size reduction.',
    icon: '📸',
    version: '2.0.0',
    route: '/tools/image_optimizer',
    gradient: 'linear-gradient(to right, #e0eafc, #cfdef3)',
    status: 'native',
  },
]

export function getPlugin(id: string) {
  return plugins.find((plugin) => plugin.id === id)
}
