'use client'

import { useState, useCallback } from 'react'
import { startAuthentication } from '@simplewebauthn/browser'
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/types'

type PasskeyButtonProps = {
  onSuccess: () => void
  onError?: (error: string) => void
  email?: string
  variant?: 'login' | 'kiosk'
  disabled?: boolean
  className?: string
}

export default function PasskeyButton({
  onSuccess,
  onError,
  email,
  variant = 'login',
  disabled = false,
  className = '',
}: PasskeyButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handlePasskeyLogin = useCallback(async () => {
    setIsLoading(true)

    try {
      // Determine which endpoint to use based on variant
      const optionsEndpoint =
        variant === 'kiosk'
          ? '/api/kiosk/auth/passkey'
          : '/api/auth/passkey/options'

      const verifyEndpoint =
        variant === 'kiosk'
          ? '/api/kiosk/auth/passkey'
          : '/api/auth/passkey/verify'

      // Step 1: Get authentication options
      const optionsResponse = await fetch(optionsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          variant === 'kiosk' ? { action: 'options', email } : { email }
        ),
      })

      if (!optionsResponse.ok) {
        const errorData = await optionsResponse.json()
        throw new Error(errorData.error || 'Failed to get authentication options')
      }

      const options =
        (await optionsResponse.json()) as PublicKeyCredentialRequestOptionsJSON

      // Step 2: Trigger WebAuthn authentication
      const credential = await startAuthentication(options)

      // Step 3: Verify the credential
      const verifyResponse = await fetch(verifyEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          variant === 'kiosk'
            ? { action: 'verify', response: credential }
            : { response: credential }
        ),
      })

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json()
        throw new Error(errorData.error || 'Authentication failed')
      }

      onSuccess()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Passkey authentication failed'
      onError?.(message)
    } finally {
      setIsLoading(false)
    }
  }, [email, variant, onSuccess, onError])

  // Different styles based on variant
  const baseStyles =
    variant === 'kiosk'
      ? 'w-full py-4 px-4 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900'
      : 'w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <button
      type="button"
      onClick={handlePasskeyLogin}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${className}`}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Authenticating...
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
            />
          </svg>
          Sign in with Passkey
        </span>
      )}
    </button>
  )
}
