import { redirect } from 'next/navigation'
import { isKioskModeActive } from '@/lib/kiosk-mode'
import KioskGuard from '@/components/KioskGuard'

// Prevent browser caching (handles back button after kiosk launch)
export const dynamic = 'force-dynamic'

type Props = {
  children: React.ReactNode
}

export default async function DashboardLayout({ children }: Props) {
  // Server-side check (primary)
  const isKiosk = await isKioskModeActive()

  if (isKiosk) {
    redirect('/login?kioskRestricted=true')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <KioskGuard>
        {children}
      </KioskGuard>
    </div>
  )
}
