'use client'

import { useEffect } from 'react'

// Registers the service worker site-wide and captures the install prompt for the PWA plugin page.
export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
    const onPrompt = (event: Event) => {
      event.preventDefault()
      ;(window as unknown as { __deferredInstallPrompt?: Event }).__deferredInstallPrompt = event
      window.dispatchEvent(new Event('pwa-installable'))
    }
    const onInstalled = () => {
      ;(window as unknown as { __deferredInstallPrompt?: Event }).__deferredInstallPrompt = undefined
      window.dispatchEvent(new Event('pwa-installed'))
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])
  return null
}
