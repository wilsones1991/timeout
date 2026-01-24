import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

// Scopes required for Google Classroom read access
const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
].join(' ')

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { error: 'Google OAuth not configured' },
      { status: 500 }
    )
  }

  // Build the OAuth URL
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/google/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline', // Request refresh token
    prompt: 'consent', // Always show consent to get refresh token
    state: session.user.id, // Pass user ID to callback
  })

  const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`

  return NextResponse.redirect(authUrl)
}
