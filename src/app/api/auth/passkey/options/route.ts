import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { generatePasskeyAuthenticationOptions } from '@/lib/webauthn'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { email } = body as { email?: string }

    const options = await generatePasskeyAuthenticationOptions(email)

    // Store the challenge in a cookie for verification (2 minute expiry)
    const cookieStore = await cookies()
    cookieStore.set('passkey_auth_challenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 120, // 2 minutes
      path: '/',
    })

    return NextResponse.json(options)
  } catch (error) {
    console.error('Error generating authentication options:', error)
    return NextResponse.json(
      { error: 'Failed to generate authentication options' },
      { status: 500 }
    )
  }
}
