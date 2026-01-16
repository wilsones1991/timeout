import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyKioskCookie, KIOSK_COOKIE_NAME } from '@/lib/kiosk-mode-edge'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const kioskCookie = request.cookies.get(KIOSK_COOKIE_NAME)?.value
  const isKioskMode = await verifyKioskCookie(kioskCookie)

  if (!isKioskMode) {
    return NextResponse.next()
  }

  // Block admin API routes in kiosk mode
  if (pathname.startsWith('/api/admin/')) {
    return NextResponse.json(
      { error: 'Kiosk mode is active. Please log in to access this resource.' },
      { status: 401 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/admin/:path*'],
}
