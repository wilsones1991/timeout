import { cookies } from 'next/headers'
import crypto from 'crypto'

const COOKIE_NAME = 'kiosk-mode'
const COOKIE_MAX_AGE = 60 * 60 * 12 // 12 hours (matches session duration)

/**
 * Creates a signed value for the kiosk mode cookie.
 * Format: timestamp.signature
 * The signature is an HMAC of the timestamp using NEXTAUTH_SECRET.
 */
function createSignedValue(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is not set')
  }

  const timestamp = Date.now().toString()
  const signature = crypto
    .createHmac('sha256', secret)
    .update(timestamp)
    .digest('hex')

  return `${timestamp}.${signature}`
}

/**
 * Verifies a signed cookie value.
 * Returns true if the signature is valid.
 */
function verifySignedValue(value: string): boolean {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    return false
  }

  const parts = value.split('.')
  if (parts.length !== 2) {
    return false
  }

  const [timestamp, signature] = parts

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(timestamp)
    .digest('hex')

  // Use timing-safe comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return false
  }

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

/**
 * Sets the kiosk mode cookie (server-side).
 * Call this from an API route or server action.
 */
export async function setKioskMode(): Promise<void> {
  const cookieStore = await cookies()
  const signedValue = createSignedValue()

  cookieStore.set(COOKIE_NAME, signedValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

/**
 * Clears the kiosk mode cookie (server-side).
 * Call this from an API route or server action (e.g., on login).
 */
export async function clearKioskMode(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

/**
 * Checks if kiosk mode is active (server-side).
 * Returns true if the cookie exists and has a valid signature.
 */
export async function isKioskModeActive(): Promise<boolean> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(COOKIE_NAME)

  if (!cookie?.value) {
    return false
  }

  return verifySignedValue(cookie.value)
}

/**
 * Synchronous version for middleware (reads from request).
 * Use this in middleware where you have access to the request.
 */
export function isKioskModeActiveSync(cookieValue: string | undefined): boolean {
  if (!cookieValue) {
    return false
  }

  return verifySignedValue(cookieValue)
}

export const KIOSK_COOKIE_NAME = COOKIE_NAME
