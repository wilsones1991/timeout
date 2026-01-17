import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { setKioskMode, clearKioskMode, isKioskModeActive } from '@/lib/kiosk-mode'

// POST /api/kiosk-mode - Set or clear kiosk mode
export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const contentType = request.headers.get('content-type')
    console.log('[kiosk-mode] Content-Type:', contentType)

    const clonedRequest = request.clone()
    const rawBody = await clonedRequest.text()
    console.log('[kiosk-mode] Raw body:', rawBody)

    const body = await request.json()
    console.log('[kiosk-mode] Parsed body:', body)

    const { action } = body

    if (action === 'enable') {
      await setKioskMode()
      return NextResponse.json({ success: true, kioskMode: true })
    } else if (action === 'disable') {
      await clearKioskMode()
      return NextResponse.json({ success: true, kioskMode: false })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (err) {
    console.error('[kiosk-mode] Error:', err)
    return NextResponse.json({
      error: 'Invalid request',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 400 })
  }
}

// GET /api/kiosk-mode - Check if kiosk mode is active
export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const kioskMode = await isKioskModeActive()
  return NextResponse.json({ kioskMode })
}
