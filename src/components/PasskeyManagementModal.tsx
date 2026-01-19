'use client'

import { useState, useEffect, useCallback } from 'react'
import { startRegistration } from '@simplewebauthn/browser'
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/types'

type Passkey = {
  id: string
  name: string
  createdAt: string
  lastUsedAt: string | null
  deviceType: string
  backedUp: boolean
}

type Props = {
  isOpen: boolean
  onClose: () => void
}

export default function PasskeyManagementModal({ isOpen, onClose }: Props) {
  const [passkeys, setPasskeys] = useState<Passkey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [newPasskeyName, setNewPasskeyName] = useState('')

  const fetchPasskeys = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/user/passkeys')
      if (!response.ok) {
        throw new Error('Failed to load passkeys')
      }
      const data = await response.json()
      setPasskeys(data.passkeys)
    } catch {
      setError('Failed to load passkeys')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchPasskeys()
      setNewPasskeyName('')
    }
  }, [isOpen, fetchPasskeys])

  const handleRegisterPasskey = async () => {
    setIsRegistering(true)
    setError(null)

    try {
      // Get registration options
      const optionsResponse = await fetch('/api/user/passkeys/register/options')
      if (!optionsResponse.ok) {
        throw new Error('Failed to get registration options')
      }

      const options =
        (await optionsResponse.json()) as PublicKeyCredentialCreationOptionsJSON

      // Start registration
      const credential = await startRegistration(options)

      // Verify registration
      const verifyResponse = await fetch('/api/user/passkeys/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: credential,
          name: newPasskeyName || 'My Passkey',
        }),
      })

      if (!verifyResponse.ok) {
        const data = await verifyResponse.json()
        throw new Error(data.error || 'Failed to register passkey')
      }

      setNewPasskeyName('')
      await fetchPasskeys()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to register passkey'
      setError(message)
    } finally {
      setIsRegistering(false)
    }
  }

  const handleDeletePasskey = async (id: string) => {
    setError(null)

    try {
      const response = await fetch(`/api/user/passkeys?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete passkey')
      }

      await fetchPasskeys()
    } catch {
      setError('Failed to delete passkey')
    }
  }

  const handleRenamePasskey = async (id: string) => {
    if (!editName.trim()) {
      setEditingId(null)
      return
    }

    setError(null)

    try {
      const response = await fetch('/api/user/passkeys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: editName.trim() }),
      })

      if (!response.ok) {
        throw new Error('Failed to rename passkey')
      }

      setEditingId(null)
      await fetchPasskeys()
    } catch {
      setError('Failed to rename passkey')
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Passkeys</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <p className="text-gray-600 mb-6">
          Passkeys let you sign in with your face, fingerprint, or device PIN
          instead of a password.
        </p>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Add new passkey */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Add a new passkey
          </h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newPasskeyName}
              onChange={(e) => setNewPasskeyName(e.target.value)}
              placeholder="Passkey name (optional)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleRegisterPasskey}
              disabled={isRegistering}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isRegistering ? 'Adding...' : 'Add Passkey'}
            </button>
          </div>
        </div>

        {/* Passkey list */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-900">Your passkeys</h3>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : passkeys.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No passkeys registered yet
            </div>
          ) : (
            passkeys.map((passkey) => (
              <div
                key={passkey.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  {editingId === passkey.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenamePasskey(passkey.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRenamePasskey(passkey.id)}
                        className="px-2 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-500"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-gray-500 flex-shrink-0"
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
                        <span className="font-medium text-gray-900 truncate">
                          {passkey.name}
                        </span>
                        {passkey.backedUp && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            Synced
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 pl-7">
                        Created: {formatDate(passkey.createdAt)}
                        {passkey.lastUsedAt && (
                          <> &middot; Last used: {formatDate(passkey.lastUsedAt)}</>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {editingId !== passkey.id && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => {
                        setEditingId(passkey.id)
                        setEditName(passkey.name)
                      }}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                      title="Rename"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeletePasskey(passkey.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Close button */}
        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
