'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Renders a long list incrementally: only `count` items are shown, and more are
// revealed as a sentinel element scrolls into view. This keeps the initial paint
// cheap for very large catalogs (900+ cards) instead of mounting everything at once.
export function useIncrementalList(total: number, options?: { initial?: number; step?: number }) {
  const initial = options?.initial ?? 60
  const step = options?.step ?? 40
  const [count, setCount] = useState(Math.min(initial, total))
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Reset when the underlying list length changes (e.g. new search/filter).
  useEffect(() => {
    setCount(Math.min(initial, total))
  }, [total, initial])

  const setSentinel = useCallback((node: HTMLDivElement | null) => {
    sentinelRef.current = node
  }, [])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || count >= total) return

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setCount((current) => Math.min(current + step, total))
      }
    }, { rootMargin: '600px 0px' })

    observer.observe(node)
    return () => observer.disconnect()
  }, [count, total, step])

  return { count, hasMore: count < total, setSentinel }
}
