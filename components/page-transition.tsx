'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

// Re-runs the entrance animation whenever the route changes, giving a smooth
// page-change effect on client-side navigation.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [key, setKey] = useState(pathname)

  useEffect(() => { setKey(pathname) }, [pathname])

  return (
    <div key={key} className="page-transition">
      {children}
    </div>
  )
}
