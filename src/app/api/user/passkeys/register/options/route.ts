import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { auth } from '@/lib/auth'
import { generatePasskeyRegistrationOptions } from '@/lib/webauthn'

export async function GET() {
  const session = await auth()

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const options = await generatePasskeyRegistrationOptions(
      session.user.id,
      session.user.email
    )

    // Store the challenge in a cookie for verification (2 minute expiry)
    const cookieStore = await cookies()
    cookieStore.set('passkey_registration_challenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 120, // 2 minutes
      path: '/',
    })

    return NextResponse.json(options)
  } catch (error) {
    console.error('Error generating registration options:', error)
    return NextResponse.json(
      { error: 'Failed to generate registration options' },
      { status: 500 }
    )
  }
}
