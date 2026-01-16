/**
 * Edge-compatible kiosk mode utilities for middleware.
 * Uses Web Crypto API instead of Node.js crypto.
 */

export const KIOSK_COOKIE_NAME = 'kiosk-mode'

/**
 * Verifies a signed cookie value using Web Crypto API.
 * Returns true if the signature is valid.
 */
export async function verifyKioskCookie(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) {
    return false
  }

  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    return false
  }

  const parts = cookieValue.split('.')
  if (parts.length !== 2) {
    return false
  }

  const [timestamp, signature] = parts

  try {
    // Create HMAC key using Web Crypto API
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    // Sign the timestamp
    const data = encoder.encode(timestamp)
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, data)

    // Convert to hex
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Compare signatures (constant-time comparison for security)
    if (signature.length !== expectedSignature.length) {
      return false
    }

    let result = 0
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i)
    }

    return result === 0
  } catch {
    return false
  }
}
