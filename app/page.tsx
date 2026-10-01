'use client'

import { useEffect } from 'react'
import { defaultLocale, isLocale, LOCALE_COOKIE, localePath, resolveLocale, type Locale } from '../lib/i18n'

// The app is statically exported, so there is no server-side redirect. This
// root page detects the visitor's preferred locale on the client and forwards
// them to the locale-prefixed home (`/en`, `/fr`, ...). Crawlers that don't run
// JS follow the <meta> refresh to the default locale, whose canonical/hreflang
// tags then advertise every language.
function readCookieLocale(): Locale | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`))
  const value = match ? decodeURIComponent(match[1]) : null
  return isLocale(value) ? value : null
}

export default function RootRedirect() {
  useEffect(() => {
    const saved = readCookieLocale()
    const target = saved ?? resolveLocale(typeof navigator !== 'undefined' ? navigator.language : null)
    window.location.replace(localePath(target, '/'))
  }, [])

  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${localePath(defaultLocale, '/')}`} />
      <noscript>
        <a href={localePath(defaultLocale, '/')}>Continue to magicwebtools</a>
      </noscript>
    </>
  )
}
