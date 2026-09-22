'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Braces, Search, ShieldCheck } from 'lucide-react'
import { tools, toolCategories, categoryIcon, type ToolDefinition } from '../lib/tools'
import { ThemeToggle } from '../components/theme-toggle'
import { ToolIcon } from '../components/tool-icon'
import { LanguageSwitcher } from '../components/language-switcher'
import { useTranslations } from '../components/i18n-provider'
import { useIncrementalList } from '../lib/use-incremental-list'
import type { Dictionary } from '../lib/i18n'

export default function HomePage() {
  const { dict, format } = useTranslations()
  const tc = (name: string) => dict.categories[name as keyof Dictionary['categories']] ?? name
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All tools')
  const visibleTools = useMemo(() => tools.filter((tool) => (
    (category === 'All tools' || tool.category === category)
    && `${tool.name} ${tool.description} ${tool.category}`.toLowerCase().includes(query.toLowerCase())
  )), [query, category])

  const { count, hasMore, setSentinel } = useIncrementalList(visibleTools.length)

  const categoryGroups = useMemo(() => {
    return toolCategories
      .filter((item) => item !== 'All tools')
      .map((item) => {
        const grouped = tools.filter((tool) => tool.category === item)
        return { name: item, count: grouped.length, sample: grouped.slice(0, 3) as ToolDefinition[] }
      })
  }, [])

  const selectCategory = (name: string) => {
    setQuery('')
    setCategory(name)
    document.getElementById('tool-directory')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main className="developer-directory">
      <header className="directory-nav shell">
        <Link className="brand" href="/" aria-label={dict.nav.homeAria}><span>W</span> magicwebtools</Link>
        <nav className="directory-nav-links" aria-label={dict.nav.mainNav}><a href="#tool-directory">{dict.common.toolDirectory}</a><Link href="/tools">{dict.common.allTools}</Link></nav>
        <div className="runtime-status"><span /> {dict.nav.runtimeStatus}</div><ThemeToggle /><LanguageSwitcher />
      </header>

      <section className="directory-hero shell">
        <div>
          <p className="eyebrow">{dict.home.heroEyebrow}</p>
          <h1>{dict.home.heroTitleLine1}<br /><em>{dict.home.heroTitleEm}</em></h1>
          <p>{dict.home.heroLede}</p>
          <ul className="privacy-badges" aria-label={dict.home.badgesAria}>
            <li><ShieldCheck size={14} /> {dict.home.badgeFree}</li>
            <li><ShieldCheck size={14} /> {dict.home.badgeStored}</li>
            <li><ShieldCheck size={14} /> {dict.home.badgeNoDb}</li>
            <li><ShieldCheck size={14} /> {dict.home.badgePrivacy}</li>
          </ul>
        </div>
        <div className="directory-hero-stat"><Braces size={25} /><strong>{tools.length}</strong><span>{dict.home.statLabel}</span></div>
      </section>

      <section className="category-showcase shell" aria-label={dict.home.showcaseAria}>
        <div className="category-showcase-head">
          <div><p className="eyebrow">{dict.home.showcaseEyebrow}</p><h2 className="category-showcase-title">{dict.home.showcaseTitle}</h2></div>
          <p>{dict.home.showcaseLede}</p>
        </div>
        <div className="category-card-grid">
          {categoryGroups.map((group) => (
            <button type="button" className="category-card" key={group.name} onClick={() => selectCategory(group.name)} aria-label={format('{count} {name}', { count: group.count, name: tc(group.name) })}>
              <span className="category-card-icon"><ToolIcon icon={categoryIcon(group.name)} size={20} /></span>
              <h3>{tc(group.name)}</h3>
              <span className="category-card-count">{group.count} {dict.common.toolsSuffix}</span>
              <span className="category-card-sample">{group.sample.map((tool) => tool.name).join(' · ')}</span>
              <span className="category-card-footer">{dict.common.explore} <ArrowUpRight size={15} /></span>
            </button>
          ))}
        </div>
      </section>

      <section className="directory-content shell" id="tool-directory">
        <div className="directory-toolbar">
          <label className="directory-search"><Search size={18} /><span className="sr-only">{dict.common.allTools}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={dict.home.searchPlaceholder} /></label>
          <div className="directory-meta"><ShieldCheck size={15} /> {format(dict.home.matchingTools, { count: visibleTools.length })}</div>
        </div>
        <div className="category-tabs" role="tablist" aria-label={dict.home.categoriesAria}>
          {toolCategories.map((item) => <button key={item} role="tab" aria-selected={category === item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{tc(item)}<span>{item === 'All tools' ? tools.length : tools.filter((tool) => tool.category === item).length}</span></button>)}
        </div>
        <div className="directory-results"><span>{format(dict.home.showing, { count: visibleTools.length })}</span><span>{dict.home.noAccount}</span></div>
        <div className="developer-tool-grid">
          {visibleTools.slice(0, count).map((tool, index) => {
            return <Link className="developer-tool-card" href={tool.href ?? `/tools/${tool.slug}`} key={tool.slug}>
              <div className="tool-card-head"><span className="catalog-index">{String(index + 1).padStart(2, '0')}</span><span className="developer-tool-icon"><ToolIcon icon={tool.icon} size={17} /></span></div>
              <h2>{tool.name}</h2><p>{tool.description}</p>
              <span className="developer-tool-footer">{tc(tool.category)}<ArrowUpRight size={16} /></span>
            </Link>
          })}
        </div>
        {hasMore && <div ref={setSentinel} className="load-sentinel" aria-hidden="true" />}
        {visibleTools.length === 0 && <div className="empty-tools"><Search size={22} /><strong>{dict.home.emptyTitle}</strong><span>{dict.home.emptyHint}</span></div>}
      </section>
      <footer className="directory-footer shell"><span>magicwebtools / 2026</span><span>{dict.home.footerTagline}</span></footer>
    </main>
  )
}