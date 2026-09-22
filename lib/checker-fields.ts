// Input field definitions for each server-side checker tool.

export type CheckerField = {
  id: string
  type: 'text' | 'number'
  labelKey: 'host' | 'ip' | 'domain' | 'url' | 'port' | 'target'
  placeholder?: string
}

export const checkerFields: Record<string, CheckerField[]> = {
  dns_lookup: [{ id: 'host', type: 'text', labelKey: 'host', placeholder: 'example.com' }],
  ip_lookup: [{ id: 'ip', type: 'text', labelKey: 'ip', placeholder: '8.8.8.8' }],
  reverse_ip_lookup: [{ id: 'ip', type: 'text', labelKey: 'ip', placeholder: '8.8.8.8' }],
  ssl_lookup: [
    { id: 'host', type: 'text', labelKey: 'host', placeholder: 'example.com' },
    { id: 'port', type: 'number', labelKey: 'port', placeholder: '443' },
  ],
  whois_lookup: [{ id: 'domain', type: 'text', labelKey: 'domain', placeholder: 'example.com' }],
  ping: [
    { id: 'host', type: 'text', labelKey: 'host', placeholder: 'example.com' },
    { id: 'port', type: 'number', labelKey: 'port', placeholder: '443' },
  ],
  http_headers_lookup: [{ id: 'url', type: 'text', labelKey: 'url', placeholder: 'https://example.com' }],
  http2_checker: [{ id: 'url', type: 'text', labelKey: 'url', placeholder: 'https://example.com' }],
  brotli_checker: [{ id: 'url', type: 'text', labelKey: 'url', placeholder: 'https://example.com' }],
  meta_tags_checker: [{ id: 'url', type: 'text', labelKey: 'url', placeholder: 'https://example.com' }],
  safe_url_checker: [{ id: 'url', type: 'text', labelKey: 'url', placeholder: 'https://example.com' }],
  google_cache_checker: [{ id: 'url', type: 'text', labelKey: 'url', placeholder: 'https://example.com' }],
  url_redirect_checker: [{ id: 'url', type: 'text', labelKey: 'url', placeholder: 'https://example.com' }],
  website_hosting_checker: [{ id: 'host', type: 'text', labelKey: 'host', placeholder: 'example.com' }],
}

export function getCheckerFields(slug: string): CheckerField[] {
  return checkerFields[slug] ?? [{ id: 'host', type: 'text', labelKey: 'host' }]
}

export function isCheckerTool(slug: string): boolean {
  return slug in checkerFields
}
