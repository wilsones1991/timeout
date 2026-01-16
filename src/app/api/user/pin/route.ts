import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validatePinFormat, hashPin } from '@/lib/pin'

// POST /api/user/pin - Set or update PIN
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

    if (!validatePinFormat(pin)) {
      return NextResponse.json(
        { error: 'PIN must be 4-6 digits' },
        { status: 400 }
      )
    }

    const pinHash = await hashPin(pin)

    await prisma.user.update({
      where: { id: session.user.id },
      data: { pinHash }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error setting PIN:', error)
    return NextResponse.json(
      { error: 'Failed to set PIN' },
      { status: 500 }
    )
  }
}

// DELETE /api/user/pin - Remove PIN
export async function DELETE() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { pinHash: null }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing PIN:', error)
    return NextResponse.json(
      { error: 'Failed to remove PIN' },
      { status: 500 }
    )
  }
}
