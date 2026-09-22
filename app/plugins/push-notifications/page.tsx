'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Send } from 'lucide-react'
import { PluginShell } from '../../../components/plugin-shell'
import { getPlugin } from '../../../lib/plugins'

const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)))
}

export default function PushNotificationsPluginPage() {
  const plugin = getPlugin('push-notifications')!
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [title, setTitle] = useState('Hello from magicwebtools')
  const [body, setBody] = useState('Your push notifications plugin is working.')
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) { setPermission('unsupported'); return }
    setPermission(Notification.permission)
    navigator.serviceWorker.ready.then((registration) => registration.pushManager.getSubscription().then((sub) => setSubscribed(Boolean(sub))))
  }, [])

  const enable = async () => {
    setStatus('')
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result !== 'granted') { setStatus('Permission was not granted.'); return }
    try {
      const registration = await navigator.serviceWorker.ready
      if (vapidKey) {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })
        await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription) })
        setSubscribed(true)
        setStatus('Subscribed to push notifications.')
      } else {
        setSubscribed(true)
        setStatus('Notifications enabled. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY to enable server-sent web push.')
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not subscribe.')
    }
  }

  const disable = async () => {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: subscription.endpoint }) })
      await subscription.unsubscribe()
    }
    setSubscribed(false)
    setStatus('Unsubscribed.')
  }

  const sendTest = async () => {
    if (permission !== 'granted') { setStatus('Enable notifications first.'); return }
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(title, { body, icon: '/icons/icon.svg', badge: '/icons/icon.svg', data: { url: '/plugins/push-notifications' } })
    setStatus('Test notification sent.')
  }

  const unsupported = permission === 'unsupported'

  return (
    <PluginShell icon={plugin.icon} gradient={plugin.gradient} name={plugin.name} tagline={plugin.description}>
      <div className="plugin-stat-row">
        <div className="plugin-stat"><span>Permission</span><strong>{unsupported ? 'N/A' : permission}</strong></div>
        <div className="plugin-stat"><span>Subscription</span><strong>{subscribed ? 'Active' : 'None'}</strong></div>
        <div className="plugin-stat"><span>Web push</span><strong>{vapidKey ? 'VAPID set' : 'Local'}</strong></div>
      </div>

      <section className="plugin-section">
        <h3>Subscriber controls</h3>
        {unsupported
          ? <p style={{ color: 'var(--app-muted)', fontSize: 13, margin: 0 }}>This browser does not support notifications or service workers.</p>
          : <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {subscribed
                ? <button className="ghost-button danger-button" onClick={disable}><BellOff size={15} /> Unsubscribe</button>
                : <button className="primary-button" onClick={enable}><Bell size={15} /> Enable notifications</button>}
            </div>}
      </section>

      <section className="plugin-section">
        <h3>Send a test notification</h3>
        <div className="plugin-form">
          <div className="tool-field"><label>Title</label><input value={title} onChange={(event) => setTitle(event.target.value)} /></div>
          <div className="tool-field"><label>Message</label><textarea value={body} onChange={(event) => setBody(event.target.value)} /></div>
          <button className="primary-button" onClick={sendTest} disabled={permission !== 'granted'}><Send size={15} /> Send test</button>
        </div>
      </section>

      {status && <div className="plugin-note"><Bell size={18} /><div><strong>Status</strong>{status}</div></div>}

      <div className="plugin-note">
        <Send size={18} />
        <div><strong>Production web push</strong>Generate VAPID keys, set <code>NEXT_PUBLIC_VAPID_PUBLIC_KEY</code>, store subscriptions server-side (the <code>/api/push/subscribe</code> route scaffolds this), and dispatch pushes with the <code>web-push</code> library.</div>
      </div>
    </PluginShell>
  )
}
