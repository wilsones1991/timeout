import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

export async function GET(request: NextRequest) {
  const session = await auth()
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', baseUrl))
  }

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    const errorUrl = new URL('/dashboard', baseUrl)
    errorUrl.searchParams.set('google', 'error')
    errorUrl.searchParams.set('error_message', error)
    return NextResponse.redirect(errorUrl)
  }

  // Validate required params
  if (!code || !state) {
    const errorUrl = new URL('/dashboard', baseUrl)
    errorUrl.searchParams.set('google', 'error')
    errorUrl.searchParams.set('error_message', 'Missing authorization code')
    return NextResponse.redirect(errorUrl)
  }

  // Verify state matches the current user
  if (state !== session.user.id) {
    const errorUrl = new URL('/dashboard', baseUrl)
    errorUrl.searchParams.set('google', 'error')
    errorUrl.searchParams.set('error_message', 'Invalid state parameter')
    return NextResponse.redirect(errorUrl)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    const errorUrl = new URL('/dashboard', baseUrl)
    errorUrl.searchParams.set('google', 'error')
    errorUrl.searchParams.set('error_message', 'Google OAuth not configured')
    return NextResponse.redirect(errorUrl)
  }

  // Exchange code for tokens
  const redirectUri = `${baseUrl}/api/google/callback`

  try {
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      const errorUrl = new URL('/dashboard', baseUrl)
      errorUrl.searchParams.set('google', 'error')
      errorUrl.searchParams.set('error_message', 'Failed to get access token')
      return NextResponse.redirect(errorUrl)
    }

    const tokens = await tokenResponse.json()

    // Store encrypted tokens in database
    await prisma.googleAccount.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token
          ? encrypt(tokens.refresh_token)
          : null,
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        scope: tokens.scope || '',
      },
      update: {
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token
          ? encrypt(tokens.refresh_token)
          : undefined,
        expiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        scope: tokens.scope || '',
      },
    })

    // Redirect to dashboard with success indicator
    const successUrl = new URL('/dashboard', baseUrl)
    successUrl.searchParams.set('google', 'connected')
    return NextResponse.redirect(successUrl)
  } catch (err) {
    console.error('OAuth callback error:', err)
    const errorUrl = new URL('/dashboard', baseUrl)
    errorUrl.searchParams.set('google', 'error')
    errorUrl.searchParams.set('error_message', 'An unexpected error occurred')
    return NextResponse.redirect(errorUrl)
  }
}
