import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyPasskeyAuthentication } from '@/lib/webauthn'
import { createSessionForUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import type { AuthenticationResponseJSON } from '@simplewebauthn/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { response } = body as { response: AuthenticationResponseJSON }

    if (!response) {
      return NextResponse.json(
        { error: 'Missing authentication response' },
        { status: 400 }
      )
    }

    // Get the challenge from the cookie
    const cookieStore = await cookies()
    const challenge = cookieStore.get('passkey_auth_challenge')?.value

    if (!challenge) {
      return NextResponse.json(
        { error: 'Authentication challenge expired' },
        { status: 400 }
      )
    }

    // Clear the challenge cookie
    cookieStore.delete('passkey_auth_challenge')

    const result = await verifyPasskeyAuthentication(response, challenge)

    if (!result.verified || !result.userId) {
      return NextResponse.json(
        { error: 'Passkey authentication failed' },
        { status: 401 }
      )
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Decrypt user name if it exists
    const decryptedName = user.name ? decrypt(user.name) : null

    // Create a session for the user
    await createSessionForUser({
      id: user.id,
      email: user.email,
      name: decryptedName,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: decryptedName,
      },
    })
  } catch (error) {
    console.error('Error verifying authentication:', error)
    return NextResponse.json(
      { error: 'Failed to verify authentication' },
      { status: 500 }
    )
  }
}
