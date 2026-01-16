'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const INDICATOR_COOKIE = 'kiosk-active'

function hasKioskIndicatorCookie(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some(c => c.trim().startsWith(`${INDICATOR_COOKIE}=`))
}

export default function KioskGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  // Check synchronously on initial render (client-side only)
  const isKioskMode = hasKioskIndicatorCookie()

  useEffect(() => {
    // Redirect if kiosk mode is active
    if (hasKioskIndicatorCookie()) {
      router.replace('/login?kioskRestricted=true')
    }
  }, [router])

  // If kiosk mode detected, don't render children (prevents flash)
  if (isKioskMode) {
    return null
  }

  return <>{children}</>
}
