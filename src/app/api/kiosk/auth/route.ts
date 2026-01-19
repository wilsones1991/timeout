import { NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { setKioskMode, clearKioskMode } from '@/lib/kiosk-mode'
import { signIn, signOut } from '@/lib/auth'
import { AuthError } from 'next-auth'

// POST /api/kiosk/auth - AJAX authentication for kiosk mode (no redirects)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase()

    // Validate credentials directly (same logic as auth.ts authorize)
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const isPasswordValid = await compare(password, user.passwordHash)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Attempt to sign in using NextAuth
    try {
      await signIn('credentials', {
        email: normalizedEmail,
        password,
        redirect: false,
      })
    } catch (error) {
      // NextAuth may throw NEXT_REDIRECT which is expected behavior
      // for successful sign-ins when redirect is handled
      if (error instanceof AuthError) {
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401 }
        )
      }
      // For NEXT_REDIRECT errors, this is actually a success in server context
      // Continue to enable kiosk mode
    }

    // Enable kiosk mode
    await setKioskMode()

    // Decrypt user name for response
    const decryptedName = user.name ? decrypt(user.name) : null

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: decryptedName,
      },
    })
  } catch (error) {
    console.error('[kiosk/auth] Error:', error)
    return NextResponse.json(
      { error: 'An error occurred during authentication' },
      { status: 500 }
    )
  }
}

// DELETE /api/kiosk/auth - Logout from kiosk mode
export async function DELETE() {
  try {
    // Clear kiosk mode cookie
    await clearKioskMode()

    // Sign out from NextAuth session
    try {
      await signOut({ redirect: false })
    } catch {
      // signOut may throw NEXT_REDIRECT which is expected behavior
      // Continue with logout response
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[kiosk/auth] Logout error:', error)
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    )
  }
}
