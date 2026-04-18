'use client'

import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setMatches(e.matches)
    handler(mql)
    mql.addEventListener('change', handler as (e: MediaQueryListEvent) => void)
    return () => mql.removeEventListener('change', handler as (e: MediaQueryListEvent) => void)
  }, [query])

  return matches
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}
