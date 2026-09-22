'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'light' | 'dark'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('magicwebtools-theme')
    const initialTheme: Theme = savedTheme === 'dark' ? 'dark' : 'light'
    setTheme(initialTheme)
    document.documentElement.dataset.theme = initialTheme
  }, [])

  const selectTheme = (nextTheme: Theme) => {
    setTheme(nextTheme)
    document.documentElement.dataset.theme = nextTheme
    window.localStorage.setItem('magicwebtools-theme', nextTheme)
  }

  return (
    <div className="theme-toggle" aria-label="Color theme">
      <button className={theme === 'light' ? 'active' : ''} onClick={() => selectTheme('light')} aria-pressed={theme === 'light'} title="Use light theme"><Sun size={14} /><span>Light</span></button>
      <button className={theme === 'dark' ? 'active' : ''} onClick={() => selectTheme('dark')} aria-pressed={theme === 'dark'} title="Use dark theme"><Moon size={14} /><span>Dark</span></button>
    </div>
  )
}