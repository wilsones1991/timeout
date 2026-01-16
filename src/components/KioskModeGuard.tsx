'use client'

import { useKioskModeCheck } from '@/hooks/useKioskCheck'

/**
 * Client component that checks if kiosk mode is active and redirects to login.
 * Add this to pages that should not be accessible in kiosk mode.
 * Renders nothing - just performs the check on mount.
 */
export default function KioskModeGuard() {
  useKioskModeCheck()
  return null
}
