'use client'

import { useState, useCallback, useEffect } from 'react'

type Props = {
  isOpen: boolean
  onClose: () => void
  hasExistingPin: boolean
  onPinUpdated: () => void
}

type Step = 'enter' | 'confirm'

export default function PinSetupModal({ isOpen, onClose, hasExistingPin, onPinUpdated }: Props) {
  const [step, setStep] = useState<Step>('enter')
  const [pin, setPin] = useState('')
  const [firstPin, setFirstPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const maxLength = 6

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('enter')
      setPin('')
      setFirstPin('')
      setError(null)
    }
  }, [isOpen])

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

  const handleClose = useCallback(() => {
    setStep('enter')
    setPin('')
    setFirstPin('')
    setError(null)
    onClose()
  }, [onClose])

  const submitPin = useCallback(async (pinValue: string) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/user/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinValue })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to set PIN')
      }

      onPinUpdated()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set PIN')
    } finally {
      setIsSubmitting(false)
    }
  }, [onPinUpdated, handleClose])

  const handleNext = useCallback(() => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits')
      return
    }

    if (step === 'enter') {
      setFirstPin(pin)
      setPin('')
      setStep('confirm')
    } else if (step === 'confirm') {
      if (pin !== firstPin) {
        setError('PINs do not match')
        setPin('')
        return
      }
      submitPin(pin)
    }
  }, [pin, step, firstPin, submitPin])

  const handleRemovePin = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/user/pin', {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove PIN')
      }

      onPinUpdated()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove PIN')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = useCallback(() => {
    if (step === 'confirm') {
      setStep('enter')
      setPin(firstPin)
      setError(null)
    }
  }, [step, firstPin])

  if (!isOpen) return null

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back']

  const title = step === 'enter' ? 'Enter New PIN' : 'Confirm PIN'
  const description = step === 'enter' ? 'Enter a 4-6 digit PIN' : 'Re-enter your PIN to confirm'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600">{description}</p>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-3 mb-6">
          {Array.from({ length: maxLength }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full ${
                i < pin.length ? 'bg-gray-900' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="text-center mb-4 text-red-600 text-sm">
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
                  className="h-14 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium"
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
                  className="h-14 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center"
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
                className="h-14 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-900 text-2xl font-medium"
              >
                {key}
              </button>
            )
          })}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          {step === 'confirm' ? (
            <button
              onClick={handleBack}
              className="flex-1 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
            >
              Back
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="flex-1 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={pin.length < 4 || isSubmitting}
            className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : step === 'enter' ? 'Next' : 'Save PIN'}
          </button>
        </div>

        {/* Remove PIN option */}
        {hasExistingPin && step === 'enter' && (
          <button
            onClick={handleRemovePin}
            disabled={isSubmitting}
            className="w-full mt-4 py-2 text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
          >
            Remove existing PIN
          </button>
        )}
      </div>
    </div>
  )
}
