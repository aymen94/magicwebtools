'use client'

import { ArrowLeft } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'

export function PluginShell({ icon, gradient, name, tagline, children }: {
  icon: string
  gradient: string
  name: string
  tagline: string
  children: React.ReactNode
}) {
  return (
    <main className="workspace-page">
      <header className="workspace-nav shell">
        <a href="/" className="brand"><span>W</span> magicwebtools</a>
        <a href="/plugins" className="back-link"><ArrowLeft size={15} /> All plugins</a>
        <div style={{ marginLeft: 'auto' }} /><ThemeToggle />
      </header>
      <div className="plugin-page">
        <div className="workspace-breadcrumb">Plugins <span>/</span> {name}</div>
        <div className="plugin-hero">
          <span className="plugin-emoji" style={{ background: gradient }}>{icon}</span>
          <div><h1>{name}</h1><p>{tagline}</p></div>
        </div>
        {children}
      </div>
    </main>
  )
}
