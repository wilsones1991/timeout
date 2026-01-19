import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  generatePasskeyAuthenticationOptions,
  verifyPasskeyAuthentication,
} from '@/lib/webauthn'
import { createSessionForUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { setKioskMode } from '@/lib/kiosk-mode'
import type { AuthenticationResponseJSON } from '@simplewebauthn/types'

// POST /api/kiosk/auth/passkey - Passkey auth + enable kiosk mode
// Two-step process:
// 1. POST with action: 'options' to get authentication options
// 2. POST with action: 'verify' and response to verify and authenticate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, email, response } = body as {
      action: 'options' | 'verify'
      email?: string
      response?: AuthenticationResponseJSON
    }

    if (action === 'options') {
      // Generate authentication options
      const options = await generatePasskeyAuthenticationOptions(email)

      // Store the challenge in a cookie for verification (2 minute expiry)
      const cookieStore = await cookies()
      cookieStore.set('kiosk_passkey_challenge', options.challenge, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 120, // 2 minutes
        path: '/',
      })

      return NextResponse.json(options)
    }

    if (action === 'verify') {
      if (!response) {
        return NextResponse.json(
          { error: 'Missing authentication response' },
          { status: 400 }
        )
      }

      // Get the challenge from the cookie
      const cookieStore = await cookies()
      const challenge = cookieStore.get('kiosk_passkey_challenge')?.value

      if (!challenge) {
        return NextResponse.json(
          { error: 'Authentication challenge expired' },
          { status: 400 }
        )
      }

      // Clear the challenge cookie
      cookieStore.delete('kiosk_passkey_challenge')

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

      // Enable kiosk mode
      await setKioskMode()

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: decryptedName,
        },
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[kiosk/auth/passkey] Error:', error)
    return NextResponse.json(
      { error: 'An error occurred during authentication' },
      { status: 500 }
    )
  }
}
