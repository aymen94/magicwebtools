'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowUpRight, Search } from 'lucide-react'
import { tools, toolCategories } from '../../lib/tools'
import { ThemeToggle } from '../../components/theme-toggle'
import { ToolIcon } from '../../components/tool-icon'
import { LanguageSwitcher } from '../../components/language-switcher'
import { useTranslations } from '../../components/i18n-provider'
import { useIncrementalList } from '../../lib/use-incremental-list'
import type { Dictionary } from '../../lib/i18n'

export default function ToolsPage() {
  const { dict, format } = useTranslations()
  const tc = (name: string) => dict.categories[name as keyof Dictionary['categories']] ?? name
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All tools')
  const visibleTools = useMemo(() => tools.filter((tool) => (category === 'All tools' || tool.category === category) && `${tool.name} ${tool.description}`.toLowerCase().includes(query.toLowerCase())), [query, category])
  const { count, hasMore, setSentinel } = useIncrementalList(visibleTools.length)

  return <main className="catalog-page"><header className="catalog-nav shell"><Link href="/" className="brand"><span>W</span> magicwebtools</Link><div className="catalog-status">{format(dict.catalog.status, { count: tools.length })}</div><ThemeToggle /><LanguageSwitcher /></header><section className="catalog-hero shell"><p className="eyebrow">{dict.catalog.heroEyebrow}</p><h1>{dict.catalog.heroTitleLine1}<br /><em>{dict.catalog.heroTitleEm}</em></h1><p>{dict.catalog.heroLede}</p></section><section className="catalog-content shell"><aside><div className="catalog-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={dict.catalog.searchPlaceholder} /></div><div className="category-list">{toolCategories.map((item) => <button className={category === item ? 'active' : ''} onClick={() => setCategory(item)} key={item}>{tc(item)}<span>{item === 'All tools' ? tools.length : tools.filter((tool) => tool.category === item).length}</span></button>)}</div></aside><div><div className="catalog-grid">{visibleTools.slice(0, count).map((tool, index) => <Link className="catalog-card" href={tool.href ?? `/tools/${tool.slug}`} key={tool.slug}><span className="catalog-index">{String(index + 1).padStart(2, '0')}</span><span className="catalog-card-icon"><ToolIcon icon={tool.icon} size={17} /></span><h2>{tool.name}</h2><p>{tool.description}</p><span className="catalog-card-footer">{tc(tool.category)}<ArrowUpRight size={16} /></span></Link>)}</div>{hasMore && <div ref={setSentinel} className="load-sentinel" aria-hidden="true" />}</div></section></main>
}