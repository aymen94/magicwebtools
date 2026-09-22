'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { ThemeToggle } from '../../components/theme-toggle'
import { LanguageSwitcher } from '../../components/language-switcher'
import { useTranslations } from '../../components/i18n-provider'
import { plugins } from '../../lib/plugins'

export default function PluginsPage() {
  const { dict } = useTranslations()

  return (
    <main className="developer-directory">
      <header className="directory-nav shell">
        <Link className="brand" href="/" aria-label={dict.nav.homeAria}><span>W</span> magicwebtools</Link>
        <nav className="directory-nav-links" aria-label={dict.nav.mainNav}><Link href="/tools">{dict.common.allTools}</Link></nav>
        <div className="runtime-status"><span /> {dict.nav.nativePlugins}</div><ThemeToggle /><LanguageSwitcher />
      </header>

      <section className="directory-hero shell">
        <div>
          <p className="eyebrow">{dict.plugins.eyebrow}</p>
          <h1>{dict.plugins.heroTitleLine1}<br /><em>{dict.plugins.heroTitleEm}</em></h1>
          <p>{dict.plugins.heroLede}</p>
        </div>
        <div className="directory-hero-stat"><strong>{plugins.length}</strong><span>{dict.plugins.available}</span></div>
      </section>

      <section className="directory-content shell">
        <div className="plugin-grid">
          {plugins.map((plugin) => (
            <Link className="plugin-card" href={plugin.route} key={plugin.id}>
              <span className="plugin-emoji" style={{ background: plugin.gradient }}>{plugin.icon}</span>
              <h2>{plugin.name}</h2>
              <p>{plugin.description}</p>
              <span className="plugin-card-footer">{plugin.status === 'native' ? dict.plugins.runsNatively : dict.plugins.serverReady}<ArrowUpRight size={16} /></span>
            </Link>
          ))}
        </div>
      </section>
      <footer className="directory-footer shell"><span>magicwebtools / 2026</span><span>{dict.plugins.footer}</span></footer>
    </main>
  )
}
