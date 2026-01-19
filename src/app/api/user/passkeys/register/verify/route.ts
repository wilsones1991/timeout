import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import { verifyPasskeyRegistration } from '@/lib/webauthn'
import type { RegistrationResponseJSON } from '@simplewebauthn/types'

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { response, name } = body as {
      response: RegistrationResponseJSON
      name?: string
    }

    if (!response) {
      return NextResponse.json(
        { error: 'Missing registration response' },
        { status: 400 }
      )
    }

    // Get the challenge from the cookie
    const cookieStore = await cookies()
    const challenge = cookieStore.get('passkey_registration_challenge')?.value

    if (!challenge) {
      return NextResponse.json(
        { error: 'Registration challenge expired' },
        { status: 400 }
      )
    }

    // Clear the challenge cookie
    cookieStore.delete('passkey_registration_challenge')

    const result = await verifyPasskeyRegistration(
      session.user.id,
      response,
      challenge,
      name
    )

    if (!result.verified) {
      return NextResponse.json(
        { error: 'Passkey verification failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      passkeyId: result.passkeyId,
    })
  } catch (error) {
    console.error('Error verifying registration:', error)
    return NextResponse.json(
      { error: 'Failed to verify registration' },
      { status: 500 }
    )
  }
}
