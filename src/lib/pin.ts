import { hash, compare } from 'bcryptjs'

const PIN_SALT_ROUNDS = 10

/**
 * Validates PIN format: 4-6 digits only
 */
export function validatePinFormat(pin: string): boolean {
  return /^\d{4,6}$/.test(pin)
}

/**
 * Hash a PIN using bcrypt
 */
export async function hashPin(pin: string): Promise<string> {
  return hash(pin, PIN_SALT_ROUNDS)
}

/**
 * Verify a PIN against a hash
 */
export async function verifyPin(pin: string, pinHash: string): Promise<boolean> {
  return compare(pin, pinHash)
}
