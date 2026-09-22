'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Download, Wifi, WifiOff } from 'lucide-react'
import { PluginShell } from '../../../components/plugin-shell'
import { getPlugin } from '../../../lib/plugins'

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export default function PwaPluginPage() {
  const plugin = getPlugin('pwa')!
  const [installable, setInstallable] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [swReady, setSwReady] = useState(false)
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const globalWindow = window as unknown as { __deferredInstallPrompt?: InstallPromptEvent }
    setInstallable(Boolean(globalWindow.__deferredInstallPrompt))
    setInstalled(window.matchMedia('(display-mode: standalone)').matches)
    setOnline(navigator.onLine)
    if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistration('/sw.js').then((registration) => setSwReady(Boolean(registration)))

    const onInstallable = () => setInstallable(true)
    const onInstalled = () => { setInstalled(true); setInstallable(false) }
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('pwa-installable', onInstallable)
    window.addEventListener('pwa-installed', onInstalled)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('pwa-installable', onInstallable)
      window.removeEventListener('pwa-installed', onInstalled)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const install = async () => {
    const globalWindow = window as unknown as { __deferredInstallPrompt?: InstallPromptEvent }
    const event = globalWindow.__deferredInstallPrompt
    if (!event) return
    await event.prompt()
    const choice = await event.userChoice
    if (choice.outcome === 'accepted') { setInstalled(true); setInstallable(false) }
    globalWindow.__deferredInstallPrompt = undefined
  }

  return (
    <PluginShell icon={plugin.icon} gradient={plugin.gradient} name={plugin.name} tagline={plugin.description}>
      <div className="plugin-stat-row">
        <div className="plugin-stat"><span>Service worker</span><strong>{swReady ? 'Active' : '…'}</strong></div>
        <div className="plugin-stat"><span>Install state</span><strong>{installed ? 'Installed' : installable ? 'Ready' : 'Browser'}</strong></div>
        <div className="plugin-stat"><span>Connection</span><strong>{online ? 'Online' : 'Offline'}</strong></div>
      </div>

      <section className="plugin-section">
        <h3>Install this app</h3>
        <p style={{ margin: '0 0 16px', color: 'var(--app-muted)', fontSize: 13 }}>
          The manifest and service worker are registered site-wide, so every page works offline and can be installed to the home screen or desktop.
        </p>
        {installed
          ? <span className="ghost-button"><CheckCircle2 size={15} /> Installed and running standalone</span>
          : installable
            ? <button className="primary-button" onClick={install}><Download size={15} /> Install magicwebtools</button>
            : <span className="ghost-button">Install prompt appears when your browser allows it (visit over HTTPS, not already installed)</span>}
      </section>

      <section className="plugin-section">
        <h3>What the plugin enables</h3>
        <div className="plugin-list">
          <div className="plugin-list-item"><span>Web app manifest</span><span className="pill-tag on">/manifest.webmanifest</span></div>
          <div className="plugin-list-item"><span>Service worker registration</span><span className={`pill-tag ${swReady ? 'on' : 'off'}`}>{swReady ? 'registered' : 'pending'}</span></div>
          <div className="plugin-list-item"><span>Offline navigation fallback</span><span className="pill-tag on">network-first cache</span></div>
          <div className="plugin-list-item"><span>Installable icons</span><span className="pill-tag on">any + maskable</span></div>
        </div>
      </section>

      <div className="plugin-note">
        {online ? <Wifi size={18} /> : <WifiOff size={18} />}
        <div><strong>Try it</strong>Install the app, then switch your network off. Cached pages keep loading from the service worker.</div>
      </div>
    </PluginShell>
  )
}
