import type { Metadata, Viewport } from 'next'
import './kiosk.css'

export const metadata: Metadata = {
  title: 'Kiosk - Classroom Check-In',
  robots: {
    index: false,
    follow: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#111827',
}

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="kiosk-container">{children}</div>
}
