import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const googleAccount = await prisma.googleAccount.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      scope: true,
      createdAt: true,
      expiresAt: true,
    },
  })

  if (!googleAccount) {
    return NextResponse.json({ connected: false })
  }

  // Check if we have a valid token (or can refresh it)
  const hasValidToken =
    googleAccount.expiresAt === null ||
    googleAccount.expiresAt.getTime() > Date.now()

  return NextResponse.json({
    connected: true,
    hasValidToken,
    connectedAt: googleAccount.createdAt,
  })
}
