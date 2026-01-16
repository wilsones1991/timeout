import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyPin } from '@/lib/pin'

// POST /api/user/pin/verify - Verify PIN
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { pin } = await request.json()

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json(
        { error: 'PIN is required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { pinHash: true }
    })

    if (!user?.pinHash) {
      // No PIN set, verification passes
      return NextResponse.json({ valid: true, noPinSet: true })
    }

    const isValid = await verifyPin(pin, user.pinHash)

    return NextResponse.json({ valid: isValid })
  } catch (error) {
    console.error('Error verifying PIN:', error)
    return NextResponse.json(
      { error: 'Failed to verify PIN' },
      { status: 500 }
    )
  }
}
