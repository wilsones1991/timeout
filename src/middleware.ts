import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyKioskCookie, KIOSK_COOKIE_NAME } from '@/lib/kiosk-mode-edge'

// Routes that are allowed when kiosk mode is active
const KIOSK_ALLOWED_PATTERNS = [
  // Kiosk pages
  /^\/classroom\/[^/]+\/checkin$/,
  /^\/classroom\/[^/]+\/kiosk-launch$/,
  /^\/classroom\/[^/]+\/waitlist-widget$/,

  // Kiosk APIs
  /^\/api\/classroom\/[^/]+\/kiosk$/,
  /^\/api\/classroom\/[^/]+\/lookup$/,
  /^\/api\/classroom\/[^/]+\/checkin$/,
  /^\/api\/classroom\/[^/]+\/queue$/,
  /^\/api\/classroom\/[^/]+\/waitlist$/,

  // Kiosk mode API
  /^\/api\/kiosk-mode$/,

  // PIN APIs (for lock/unlock)
  /^\/api\/user\/pin/,

  // Auth routes (so user can log in fresh)
  /^\/login$/,
  /^\/api\/auth/,

  // Static assets and Next.js internals
  /^\/_next/,
  /^\/favicon\.ico$/,
]

function isKioskAllowedRoute(pathname: string): boolean {
  return KIOSK_ALLOWED_PATTERNS.some(pattern => pattern.test(pathname))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if kiosk mode is active
  const kioskCookie = request.cookies.get(KIOSK_COOKIE_NAME)?.value
  const isKioskMode = await verifyKioskCookie(kioskCookie)

  if (isKioskMode && !isKioskAllowedRoute(pathname)) {
    // Kiosk mode is active but trying to access a restricted route

    // For API routes, return 401 JSON response
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Kiosk mode is active. Please log in to access this resource.' },
        { status: 401 }
      )
    }

    // For page routes, redirect to login page with a message
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('kioskRestricted', 'true')
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
