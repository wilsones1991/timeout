'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Hook that redirects to login if a 401 response indicates kiosk mode is active.
 * Use this in components that make API calls which might be restricted in kiosk mode.
 */
export function useKioskRedirect() {
  const router = useRouter()

  return {
    /**
     * Handle a fetch response - if it's a 401 with kiosk restriction, redirect to login
     */
    handleResponse: async (response: Response) => {
      if (response.status === 401) {
        try {
          const data = await response.clone().json()
          if (data.error?.includes('Kiosk mode')) {
            router.push('/login?kioskRestricted=true')
            return null
          }
        } catch {
          // Not JSON, ignore
        }
      }
      return response
    }
  }
}

/**
 * Hook that checks if kiosk mode is active on mount and redirects if so.
 * Add this to pages that should not be accessible in kiosk mode.
 */
export function useKioskModeCheck() {
  const router = useRouter()

  useEffect(() => {
    async function checkKioskMode() {
      try {
        // Make a simple request to a non-kiosk API to check if we're restricted
        const response = await fetch('/api/kiosk-mode')
        if (response.status === 401) {
          // Session expired or not authenticated
          return
        }
        const data = await response.json()
        if (data.kioskMode) {
          router.push('/login?kioskRestricted=true')
        }
      } catch {
        // Ignore errors
      }
    }

    checkKioskMode()
  }, [router])
}
