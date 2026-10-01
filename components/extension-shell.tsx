'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { useLocalePath } from './i18n-provider'

export function Extensionshell({ icon, gradient, name, tagline, children }: {
  icon: string
  gradient: string
  name: string
  tagline: string
  children: React.ReactNode
}) {
  const lp = useLocalePath()
  return (
    <main className="workspace-page">
      <header className="workspace-nav shell">
        <Link href={lp('/')} className="brand"><span>W</span> magicwebtools</Link>
        <Link href={lp('/extensions')} className="back-link"><ArrowLeft size={15} /> All Extensions</Link>
        <div style={{ marginLeft: 'auto' }} /><ThemeToggle />
      </header>
      <div className="plugin-page">
        <div className="workspace-breadcrumb">Extensions <span>/</span> {name}</div>
        <div className="plugin-hero">
          <span className="plugin-emoji" style={{ background: gradient }}>{icon}</span>
          <div><h1>{name}</h1><p>{tagline}</p></div>
        </div>
        {children}
      </div>
    </main>
  )
}
