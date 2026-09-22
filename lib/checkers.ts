// Server-side network checker tools, ported from app/controllers/Tools.php.
// These run in the Node.js runtime (they use dns/net/tls and outbound fetch).

import dns from 'node:dns/promises'
import net from 'node:net'
import tls from 'node:tls'

export type CheckerResult = {
  // A human-readable text block always shown to the user.
  text: string
  // Optional structured rows for richer rendering (label/value pairs or a table).
  rows?: { label: string; value: string }[]
}

const TIMEOUT = 8000

function hostFromInput(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error('Please enter a value.')
  try {
    if (/^https?:\/\//i.test(trimmed)) return new URL(trimmed).hostname
  } catch { /* fall through */ }
  // Strip any path/query if the user pasted "example.com/path".
  return trimmed.replace(/^\/+/, '').split('/')[0].split('?')[0]
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error('Please enter a URL.')
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function isValidIp(value: string): boolean {
  return net.isIP(value.trim()) !== 0
}

async function withTimeout<T>(promise: Promise<T>, ms = TIMEOUT): Promise<T> {
  let timer: NodeJS.Timeout
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('The request timed out.')), ms) })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer!)
  }
}

// ---- DNS lookup ------------------------------------------------------------

async function dnsLookup(host: string): Promise<CheckerResult> {
  const target = hostFromInput(host)
  const sections: string[] = []
  const resolvers: Array<[string, () => Promise<unknown[]>]> = [
    ['A', () => dns.resolve4(target)],
    ['AAAA', () => dns.resolve6(target)],
    ['CNAME', () => dns.resolveCname(target)],
    ['MX', () => dns.resolveMx(target)],
    ['NS', () => dns.resolveNs(target)],
    ['TXT', () => dns.resolveTxt(target).then((records) => records.map((parts) => parts.join('')))],
    ['SOA', () => dns.resolveSoa(target).then((soa) => [soa])],
    ['CAA', () => dns.resolveCaa(target)],
  ]

  for (const [type, resolve] of resolvers) {
    try {
      const records = await resolve()
      if (records && records.length) {
        sections.push(`${type}\n${records.map((record) => typeof record === 'object' ? JSON.stringify(record) : String(record)).join('\n')}`)
      }
    } catch { /* record type not present */ }
  }

  if (!sections.length) throw new Error('No DNS records were found for this host.')
  return { text: sections.join('\n\n') }
}

// ---- IP lookup (geo via ip-api.com) ---------------------------------------

async function ipLookup(ip: string): Promise<CheckerResult> {
  const target = ip.trim() || ''
  if (!isValidIp(target)) throw new Error('Please enter a valid IP address.')
  const response = await withTimeout(fetch(`http://ip-api.com/json/${encodeURIComponent(target)}?fields=status,message,continent,country,regionName,city,zip,lat,lon,timezone,isp,org,as,query`))
  const data = await response.json()
  if (data.status !== 'success') throw new Error(data.message || 'The IP address could not be located.')
  const rows = [
    { label: 'IP', value: String(data.query ?? target) },
    { label: 'Continent', value: String(data.continent ?? '-') },
    { label: 'Country', value: String(data.country ?? '-') },
    { label: 'Region', value: String(data.regionName ?? '-') },
    { label: 'City', value: String(data.city ?? '-') },
    { label: 'ZIP', value: String(data.zip ?? '-') },
    { label: 'Coordinates', value: `${data.lat ?? '-'}, ${data.lon ?? '-'}` },
    { label: 'Timezone', value: String(data.timezone ?? '-') },
    { label: 'ISP', value: String(data.isp ?? '-') },
    { label: 'Organization', value: String(data.org ?? '-') },
    { label: 'AS', value: String(data.as ?? '-') },
  ]
  return { text: rows.map((row) => `${row.label}: ${row.value}`).join('\n'), rows }
}

async function reverseIpLookup(ip: string): Promise<CheckerResult> {
  const target = ip.trim()
  if (!isValidIp(target)) throw new Error('Please enter a valid IP address.')
  try {
    const hostnames = await dns.reverse(target)
    if (!hostnames.length) throw new Error('No hostname is associated with this IP address.')
    return { text: hostnames.join('\n') }
  } catch {
    throw new Error('No hostname is associated with this IP address.')
  }
}

// ---- SSL certificate lookup ------------------------------------------------

function sslLookup(host: string, port = 443): Promise<CheckerResult> {
  const target = hostFromInput(host)
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: target, port, servername: target, rejectUnauthorized: false, timeout: TIMEOUT }, () => {
      const cert = socket.getPeerCertificate()
      socket.end()
      if (!cert || !Object.keys(cert).length) { reject(new Error('No SSL certificate was found for this host.')); return }
      const now = Date.now()
      const validFrom = cert.valid_from ? new Date(cert.valid_from) : null
      const validTo = cert.valid_to ? new Date(cert.valid_to) : null
      const isValid = Boolean(validFrom && validTo && now > validFrom.getTime() && now < validTo.getTime())
      const rows = [
        { label: 'Common name', value: String(cert.subject?.CN ?? '-') },
        { label: 'Issuer organization', value: String(cert.issuer?.O ?? '-') },
        { label: 'Issuer common name', value: String(cert.issuer?.CN ?? '-') },
        { label: 'Issuer country', value: String(cert.issuer?.C ?? '-') },
        { label: 'Valid from', value: validFrom ? validFrom.toISOString() : '-' },
        { label: 'Valid to', value: validTo ? validTo.toISOString() : '-' },
        { label: 'Serial number', value: String(cert.serialNumber ?? '-') },
        { label: 'Valid now', value: isValid ? 'Yes' : 'No' },
      ]
      resolve({ text: rows.map((row) => `${row.label}: ${row.value}`).join('\n'), rows })
    })
    socket.on('error', () => reject(new Error('Could not establish a secure connection to this host.')))
    socket.on('timeout', () => { socket.destroy(); reject(new Error('The connection timed out.')) })
  })
}

// ---- WHOIS via RDAP --------------------------------------------------------

let rdapMapCache: { at: number; map: Record<string, string> } | null = null

async function getRdapMap(): Promise<Record<string, string>> {
  if (rdapMapCache && Date.now() - rdapMapCache.at < 86400000) return rdapMapCache.map
  const response = await withTimeout(fetch('https://data.iana.org/rdap/dns.json'))
  const data = await response.json()
  const map: Record<string, string> = {}
  for (const service of data.services ?? []) {
    const [tlds, endpoints] = service
    if (!endpoints?.length) continue
    const endpoint = String(endpoints[0]).replace(/\/$/, '')
    for (const tld of tlds) map[String(tld).toLowerCase()] = endpoint
  }
  rdapMapCache = { at: Date.now(), map }
  return map
}

async function whoisLookup(domainName: string): Promise<CheckerResult> {
  const domain = hostFromInput(domainName).toLowerCase()
  const tld = domain.split('.').pop() ?? ''
  const map = await getRdapMap()
  const server = map[tld]
  if (!server) throw new Error('WHOIS/RDAP is not available for this domain extension.')
  const response = await withTimeout(fetch(`${server}/domain/${encodeURIComponent(domain)}`, { headers: { Accept: 'application/rdap+json' } }))
  if (!response.ok) throw new Error('No WHOIS information was found for this domain.')
  const data = await response.json()
  const events: Record<string, string> = {}
  for (const event of data.events ?? []) events[event.eventAction] = event.eventDate
  const registrar = (data.entities ?? []).find((entity: { roles?: string[] }) => entity.roles?.includes('registrar'))
  const registrarName = registrar?.vcardArray?.[1]?.find((entry: unknown[]) => entry[0] === 'fn')?.[3]
  const nameservers = (data.nameservers ?? []).map((ns: { ldhName?: string }) => ns.ldhName).filter(Boolean)
  const rows = [
    { label: 'Domain', value: String(data.ldhName ?? domain) },
    { label: 'Registration', value: events.registration ?? '-' },
    { label: 'Last changed', value: events['last changed'] ?? events.lastChanged ?? '-' },
    { label: 'Expiration', value: events.expiration ?? '-' },
    { label: 'Registrar', value: registrarName ?? '-' },
    { label: 'Status', value: (data.status ?? []).join(', ') || '-' },
    { label: 'Nameservers', value: nameservers.join(', ') || '-' },
  ]
  return { text: rows.map((row) => `${row.label}: ${row.value}`).join('\n'), rows }
}

// ---- Ping (TCP connect latency) -------------------------------------------

function ping(target: string, port = 443): Promise<CheckerResult> {
  const host = hostFromInput(target)
  const connectPort = port || 443
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const socket = new net.Socket()
    socket.setTimeout(TIMEOUT)
    socket.connect(connectPort, host, () => {
      const latency = Date.now() - start
      socket.destroy()
      resolve({
        text: `Host: ${host}\nPort: ${connectPort}\nStatus: reachable\nLatency: ${latency} ms`,
        rows: [
          { label: 'Host', value: host },
          { label: 'Port', value: String(connectPort) },
          { label: 'Status', value: 'Reachable' },
          { label: 'Latency', value: `${latency} ms` },
        ],
      })
    })
    socket.on('error', () => reject(new Error(`${host}:${connectPort} is not reachable.`)))
    socket.on('timeout', () => { socket.destroy(); reject(new Error('The connection timed out.')) })
  })
}

// ---- HTTP-based checkers ---------------------------------------------------

async function httpHeadersLookup(url: string): Promise<CheckerResult> {
  const response = await withTimeout(fetch(normalizeUrl(url), { redirect: 'manual' }))
  const rows: { label: string; value: string }[] = []
  response.headers.forEach((value, key) => rows.push({ label: key, value }))
  return { text: rows.map((row) => `${row.label}: ${row.value}`).join('\n'), rows }
}

async function http2Checker(url: string): Promise<CheckerResult> {
  // fetch() does not expose the negotiated protocol; probe with a raw TLS ALPN handshake.
  const host = hostFromInput(url)
  const supported = await new Promise<string[]>((resolve, reject) => {
    const socket = tls.connect({ host, port: 443, servername: host, ALPNProtocols: ['h2', 'http/1.1'], rejectUnauthorized: false, timeout: TIMEOUT }, () => {
      const protocol = socket.alpnProtocol
      socket.end()
      resolve(protocol ? [protocol] : [])
    })
    socket.on('error', () => reject(new Error('Could not connect to this host.')))
    socket.on('timeout', () => { socket.destroy(); reject(new Error('The connection timed out.')) })
  })
  const isHttp2 = supported.includes('h2')
  return { text: `Host: ${host}\nHTTP/2 (h2) supported: ${isHttp2 ? 'Yes' : 'No'}\nNegotiated protocol: ${supported[0] ?? 'unknown'}` }
}

async function brotliChecker(url: string): Promise<CheckerResult> {
  const response = await withTimeout(fetch(normalizeUrl(url), { headers: { 'Accept-Encoding': 'br' }, redirect: 'follow' }))
  // Node's undici decodes and may strip content-encoding; check both header and the raw vary hint.
  const encoding = response.headers.get('content-encoding') ?? ''
  const enabled = /\bbr\b/i.test(encoding)
  return { text: `URL: ${normalizeUrl(url)}\nContent-Encoding: ${encoding || '(none reported)'}\nBrotli enabled: ${enabled ? 'Yes' : 'No'}` }
}

async function metaTagsChecker(url: string): Promise<CheckerResult> {
  const response = await withTimeout(fetch(normalizeUrl(url), { headers: { 'User-Agent': 'Mozilla/5.0 magicwebtools' } }))
  const html = await response.text()
  const rows: { label: string; value: string }[] = []
  const metaRegex = /<meta\s+[^>]*>/gi
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (titleMatch) rows.push({ label: 'title', value: titleMatch[1].trim() })
  for (const tag of html.match(metaRegex) ?? []) {
    const nameMatch = tag.match(/(?:name|property)\s*=\s*["']([^"']+)["']/i)
    const contentMatch = tag.match(/content\s*=\s*["']([\s\S]*?)["']/i)
    if (nameMatch && contentMatch) rows.push({ label: nameMatch[1], value: contentMatch[1].trim() })
  }
  if (!rows.length) throw new Error('No meta tags were found on this page.')
  return { text: rows.map((row) => `${row.label}: ${row.value}`).join('\n'), rows }
}

async function urlRedirectChecker(url: string): Promise<CheckerResult> {
  const hops: { label: string; value: string }[] = []
  let current = normalizeUrl(url)
  let steps = 0
  const lines: string[] = []
  while (steps < 10) {
    const response = await withTimeout(fetch(current, { redirect: 'manual', headers: { 'User-Agent': 'magicwebtools/1.0' } }))
    const location = response.headers.get('location')
    lines.push(`${response.status} ${current}${location ? ` → ${location}` : ''}`)
    hops.push({ label: String(response.status), value: current })
    if (!location || (response.status !== 301 && response.status !== 302 && response.status !== 307 && response.status !== 308)) break
    current = new URL(location, current).toString()
    steps++
  }
  return { text: lines.join('\n'), rows: hops }
}

async function websiteHostingChecker(host: string): Promise<CheckerResult> {
  const target = hostFromInput(host)
  const [ip] = await dns.resolve4(target).catch(() => [] as string[])
  if (!ip) throw new Error('Could not resolve this host to an IP address.')
  const response = await withTimeout(fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,city,isp,org,as,query`))
  const data = await response.json()
  if (data.status !== 'success') throw new Error(data.message || 'The hosting provider could not be determined.')
  const rows = [
    { label: 'Host', value: target },
    { label: 'IP', value: ip },
    { label: 'ISP', value: String(data.isp ?? '-') },
    { label: 'Organization', value: String(data.org ?? '-') },
    { label: 'AS', value: String(data.as ?? '-') },
    { label: 'Country', value: String(data.country ?? '-') },
    { label: 'City', value: String(data.city ?? '-') },
  ]
  return { text: rows.map((row) => `${row.label}: ${row.value}`).join('\n'), rows }
}

async function googleCacheChecker(url: string): Promise<CheckerResult> {
  // Google's public cache (webcache.googleusercontent.com) was retired in 2024.
  return {
    text: `Google's public web cache was discontinued in 2024, so live cache lookups are no longer available.\n\nUse the Wayback Machine instead:\nhttps://web.archive.org/web/*/${encodeURIComponent(normalizeUrl(url))}`,
  }
}

async function safeUrlChecker(url: string): Promise<CheckerResult> {
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY
  const target = normalizeUrl(url)
  if (!apiKey) {
    return { text: `Safe Browsing checks require a Google Safe Browsing API key.\nSet GOOGLE_SAFE_BROWSING_API_KEY on the server to enable this check.\n\nChecked URL: ${target}` }
  }
  const response = await withTimeout(fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client: { clientId: 'magicwebtools', clientVersion: '1.0' },
      threatInfo: {
        threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: [{ url: target }],
      },
    }),
  }))
  const data = await response.json()
  const safe = !data.matches || data.matches.length === 0
  return { text: `Checked URL: ${target}\nResult: ${safe ? 'No threats found — the URL appears safe.' : `Unsafe — threats detected: ${data.matches.map((match: { threatType: string }) => match.threatType).join(', ')}`}` }
}

// ---- Dispatch --------------------------------------------------------------

type CheckerHandler = (input: Record<string, string>) => Promise<CheckerResult>

export const checkers: Record<string, CheckerHandler> = {
  dns_lookup: (input) => dnsLookup(input.host ?? ''),
  ip_lookup: (input) => ipLookup(input.ip ?? ''),
  reverse_ip_lookup: (input) => reverseIpLookup(input.ip ?? ''),
  ssl_lookup: (input) => sslLookup(input.host ?? '', Number(input.port) || 443),
  whois_lookup: (input) => whoisLookup(input.domain ?? input.host ?? ''),
  ping: (input) => ping(input.host ?? input.target ?? '', Number(input.port) || 443),
  http_headers_lookup: (input) => httpHeadersLookup(input.url ?? ''),
  http2_checker: (input) => http2Checker(input.url ?? ''),
  brotli_checker: (input) => brotliChecker(input.url ?? ''),
  meta_tags_checker: (input) => metaTagsChecker(input.url ?? ''),
  safe_url_checker: (input) => safeUrlChecker(input.url ?? ''),
  google_cache_checker: (input) => googleCacheChecker(input.url ?? ''),
  url_redirect_checker: (input) => urlRedirectChecker(input.url ?? ''),
  website_hosting_checker: (input) => websiteHostingChecker(input.host ?? ''),
}

export function isChecker(slug: string): boolean {
  return slug in checkers
}
