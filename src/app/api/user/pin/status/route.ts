import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/user/pin/status - Check if PIN is set
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { pinHash: true }
    })

    return NextResponse.json({ hasPin: !!user?.pinHash })
  } catch (error) {
    console.error('Error checking PIN status:', error)
    return NextResponse.json(
      { error: 'Failed to check PIN status' },
      { status: 500 }
    )
  }
}
