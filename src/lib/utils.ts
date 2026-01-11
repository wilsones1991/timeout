import { hash } from 'bcryptjs'

const SALT_ROUNDS = 12

/**
 * Hash a password using bcrypt.
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS)
}

/**
 * Format a duration in minutes to a human-readable string.
 * @param minutes - Duration in minutes
 * @returns Formatted string (e.g., "5 min ago", "1 hour ago")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 1) {
    return 'just now'
  }
  if (minutes === 1) {
    return '1 min ago'
  }
  if (minutes < 60) {
    return `${Math.floor(minutes)} min ago`
  }
  const hours = Math.floor(minutes / 60)
  if (hours === 1) {
    return '1 hour ago'
  }
  return `${hours} hours ago`
}

/**
 * Calculate the duration in minutes between a date and now.
 * @param date - Start date
 * @returns Duration in minutes
 */
export function getMinutesSince(date: Date): number {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  return Math.floor(diffMs / (1000 * 60))
}

/**
 * Check if a student has been out for an extended period (>15 minutes by default).
 * @param checkOutAt - Check out timestamp
 * @param thresholdMinutes - Threshold in minutes (default: 15)
 * @returns True if duration exceeds threshold
 */
export function isExtendedAbsence(checkOutAt: Date, thresholdMinutes = 15): boolean {
  return getMinutesSince(checkOutAt) > thresholdMinutes
}
