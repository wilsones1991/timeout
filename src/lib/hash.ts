import { createHash } from 'crypto'

/**
 * Hash a Google User ID using SHA-256 with an app-level salt.
 * This allows matching the same student across different teachers
 * while not storing the raw Google ID.
 *
 * @param googleUserId - The Google user ID from Google Classroom API
 * @returns A hex-encoded SHA-256 hash
 */
export function hashGoogleUserId(googleUserId: string): string {
  const salt = process.env.GOOGLE_ID_SALT
  if (!salt) {
    throw new Error('GOOGLE_ID_SALT environment variable is not set')
  }

  const hash = createHash('sha256')
  hash.update(salt)
  hash.update(googleUserId)
  return hash.digest('hex')
}
