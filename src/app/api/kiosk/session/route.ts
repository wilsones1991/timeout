import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isKioskModeActive } from '@/lib/kiosk-mode'
import { prisma } from '@/lib/prisma'
import { decrypt, isEncrypted } from '@/lib/encryption'

// Safely decrypt a value, returning original if not encrypted
function safeDecrypt(value: string | null): string | null {
  if (!value) return null
  return isEncrypted(value) ? decrypt(value) : value
}

// GET /api/kiosk/session - Check session status for kiosk
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        kioskMode: false,
      })
    }

    // Get user details from database for fresh data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        classrooms: {
          select: {
            id: true,
            name: true,
          },
          orderBy: { name: 'asc' },
        },
      },
    })

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        kioskMode: false,
      })
    }

    const kioskMode = await isKioskModeActive()

    // Decrypt name and classroom names (handles both encrypted and plain text)
    const decryptedName = safeDecrypt(user.name)
    const classrooms = user.classrooms.map((c) => ({
      id: c.id,
      name: safeDecrypt(c.name) ?? 'Unnamed Classroom',
    }))

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: decryptedName,
      },
      classrooms,
      kioskMode,
    })
  } catch (error) {
    console.error('[kiosk/session] Error:', error)
    return NextResponse.json(
      { error: 'Failed to check session' },
      { status: 500 }
    )
  }
}
