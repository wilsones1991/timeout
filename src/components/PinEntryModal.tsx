'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

type Props = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  title: string
  description?: string
}

export default function PinEntryModal({ isOpen, onClose, onSuccess, title, description }: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const isVerifyingRef = useRef(false)
  const pinRef = useRef('')

  const maxLength = 6

  const handleKeyPress = useCallback((key: string) => {
    if (pin.length < maxLength) {
      setPin(prev => prev + key)
      setError(null)
    }
  }, [pin.length])

  const handleBackspace = useCallback(() => {
    setPin(prev => prev.slice(0, -1))
    setError(null)
  }, [])

  const handleClear = useCallback(() => {
    setPin('')
    setError(null)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits')
      return
    }

    setIsVerifying(true)
    setError(null)

    try {
      const response = await fetch('/api/user/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      })

      const data = await response.json()

      if (data.valid) {
        setPin('')
        onSuccess()
      } else {
        setError('Incorrect PIN')
        setPin('')
      }
    } catch {
      setError('Failed to verify PIN')
    } finally {
      setIsVerifying(false)
    }
  }, [pin, onSuccess])

  const handleClose = useCallback(() => {
    setPin('')
    setError(null)
    onClose()
  }, [onClose])

  // Keep refs in sync with state for keyboard handler
  useEffect(() => {
    isVerifyingRef.current = isVerifying
  }, [isVerifying])

  useEffect(() => {
    pinRef.current = pin
  }, [pin])

  // Keyboard event handler
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      // Don't handle if verifying
      if (isVerifyingRef.current) return

      // Handle digit keys
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault()
        setPin(prev => {
          if (prev.length < maxLength) {
            setError(null)
            return prev + e.key
          }
          return prev
        })
      }
      // Handle backspace
      else if (e.key === 'Backspace') {
        e.preventDefault()
        setPin(prev => prev.slice(0, -1))
        setError(null)
      }
      // Handle escape
      else if (e.key === 'Escape') {
        e.preventDefault()
        setPin('')
        setError(null)
        onClose()
      }
      // Handle enter
      else if (e.key === 'Enter') {
        e.preventDefault()
        if (pinRef.current.length >= 4) {
          submitPin(pinRef.current)
        }
      }
    }

    async function submitPin(pinValue: string) {
      if (isVerifyingRef.current) return

      setIsVerifying(true)
      isVerifyingRef.current = true
      setError(null)

      try {
        const response = await fetch('/api/user/pin/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: pinValue })
        })

        const data = await response.json()

        if (data.valid) {
          setPin('')
          onSuccess()
        } else {
          setError('Incorrect PIN')
          setPin('')
        }
      } catch {
        setError('Failed to verify PIN')
      } finally {
        setIsVerifying(false)
        isVerifyingRef.current = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, onSuccess])

  if (!isOpen) return null

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back']

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
          {description && (
            <p className="text-gray-400">{description}</p>
          )}
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-3 mb-6">
          {Array.from({ length: maxLength }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full ${
                i < pin.length ? 'bg-white' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="text-center mb-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {keys.map((key) => {
            if (key === 'clear') {
              return (
                <button
                  key={key}
                  onClick={handleClear}
                  className="h-16 rounded-xl bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium"
                >
                  Clear
                </button>
              )
            }
            if (key === 'back') {
              return (
                <button
                  key={key}
                  onClick={handleBackspace}
                  className="h-16 rounded-xl bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                  </svg>
                </button>
              )
            }
            return (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className="h-16 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-2xl font-medium"
              >
                {key}
              </button>
            )
          })}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={pin.length < 4 || isVerifying}
            className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? 'Verifying...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
