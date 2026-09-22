'use client'

import { useEffect } from 'react'

// Adds a Material-style ripple on click to interactive elements site-wide.
const RIPPLE_SELECTOR = 'button, a, .category-card, .developer-tool-card, .catalog-card, .plugin-card, .primary-button, .ghost-button, .icon-button'

export function ClickRipple() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const onPointerDown = (event: PointerEvent) => {
      const target = (event.target as Element | null)?.closest(RIPPLE_SELECTOR) as HTMLElement | null
      if (!target) return
      // Skip disabled controls.
      if (target.hasAttribute('disabled') || target.getAttribute('aria-disabled') === 'true') return

      const rect = target.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const ripple = document.createElement('span')
      ripple.className = 'wdt-ripple'
      ripple.style.width = ripple.style.height = `${size}px`
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`

      // Ensure the host clips the ripple without permanently altering layout.
      const priorPosition = getComputedStyle(target).position
      if (priorPosition === 'static') target.style.position = 'relative'
      target.classList.add('wdt-ripple-host')
      target.appendChild(ripple)
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true })
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  return null
}
