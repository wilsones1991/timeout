import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server'
import { isoBase64URL } from '@simplewebauthn/server/helpers'
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/types'
import { prisma } from './prisma'

// WebAuthn configuration from environment
const rpID = process.env.WEBAUTHN_RP_ID || 'localhost'
const rpName = process.env.WEBAUTHN_RP_NAME || 'Timeout'
const origin = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000'

export interface PasskeyInfo {
  id: string
  name: string
  createdAt: Date
  lastUsedAt: Date | null
  deviceType: string
  backedUp: boolean
}

/**
 * Generate WebAuthn registration options for a user
 */
export async function generatePasskeyRegistrationOptions(
  userId: string,
  email: string
) {
  // Get existing passkeys for this user to exclude
  const existingPasskeys = await prisma.passkey.findMany({
    where: { userId },
    select: { credentialId: true, transports: true },
  })

  const excludeCredentials = existingPasskeys.map((passkey) => ({
    id: isoBase64URL.toBuffer(passkey.credentialId),
    type: 'public-key' as const,
    transports: passkey.transports
      ? (JSON.parse(passkey.transports) as AuthenticatorTransportFuture[])
      : undefined,
  }))

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: userId,
    userName: email,
    userDisplayName: email,
    attestationType: 'none',
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
  })

  return options
}

/**
 * Verify a passkey registration response and store the credential
 */
export async function verifyPasskeyRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  expectedChallenge: string,
  name: string = 'My Passkey'
): Promise<{ verified: boolean; passkeyId?: string }> {
  let verification: VerifiedRegistrationResponse

  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    })
  } catch {
    return { verified: false }
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { verified: false }
  }

  const {
    credentialID,
    credentialPublicKey,
    counter,
    credentialDeviceType,
    credentialBackedUp,
  } = verification.registrationInfo

  // Store the passkey in the database
  const passkey = await prisma.passkey.create({
    data: {
      userId,
      credentialId: isoBase64URL.fromBuffer(credentialID),
      credentialPublicKey: Buffer.from(credentialPublicKey),
      counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: response.response.transports
        ? JSON.stringify(response.response.transports)
        : null,
      name,
    },
  })

  return { verified: true, passkeyId: passkey.id }
}

/**
 * Generate WebAuthn authentication options
 * If email is provided, only allow credentials for that user
 */
export async function generatePasskeyAuthenticationOptions(email?: string) {
  let allowCredentials:
    | {
        id: Uint8Array
        type: 'public-key'
        transports?: AuthenticatorTransportFuture[]
      }[]
    | undefined

  if (email) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        passkeys: {
          select: { credentialId: true, transports: true },
        },
      },
    })

    if (user && user.passkeys.length > 0) {
      allowCredentials = user.passkeys.map((passkey) => ({
        id: isoBase64URL.toBuffer(passkey.credentialId),
        type: 'public-key' as const,
        transports: passkey.transports
          ? (JSON.parse(passkey.transports) as AuthenticatorTransportFuture[])
          : undefined,
      }))
    }
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
    allowCredentials,
  })

  return options
}

/**
 * Verify a passkey authentication response
 * Returns the userId if successful
 */
export async function verifyPasskeyAuthentication(
  response: AuthenticationResponseJSON,
  expectedChallenge: string
): Promise<{ verified: boolean; userId?: string }> {
  // Find the passkey by credential ID
  const credentialId = response.id
  const passkey = await prisma.passkey.findUnique({
    where: { credentialId },
    include: { user: true },
  })

  if (!passkey) {
    return { verified: false }
  }

  let verification: VerifiedAuthenticationResponse

  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: isoBase64URL.toBuffer(passkey.credentialId),
        credentialPublicKey: passkey.credentialPublicKey,
        counter: Number(passkey.counter),
        transports: passkey.transports
          ? (JSON.parse(passkey.transports) as AuthenticatorTransportFuture[])
          : undefined,
      },
    })
  } catch {
    return { verified: false }
  }

  if (!verification.verified) {
    return { verified: false }
  }

  // Update the counter and last used time
  await prisma.passkey.update({
    where: { id: passkey.id },
    data: {
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    },
  })

  return { verified: true, userId: passkey.userId }
}

/**
 * Get all passkeys for a user
 */
export async function getUserPasskeys(userId: string): Promise<PasskeyInfo[]> {
  const passkeys = await prisma.passkey.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      lastUsedAt: true,
      deviceType: true,
      backedUp: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return passkeys
}

/**
 * Delete a passkey
 */
export async function deletePasskey(
  passkeyId: string,
  userId: string
): Promise<boolean> {
  const result = await prisma.passkey.deleteMany({
    where: { id: passkeyId, userId },
  })

  return result.count > 0
}

/**
 * Rename a passkey
 */
export async function renamePasskey(
  passkeyId: string,
  userId: string,
  name: string
): Promise<boolean> {
  const result = await prisma.passkey.updateMany({
    where: { id: passkeyId, userId },
    data: { name },
  })

  return result.count > 0
}
