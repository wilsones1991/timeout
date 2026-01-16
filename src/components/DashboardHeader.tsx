'use client'

import { useState, useEffect } from 'react'
import PinSetupModal from './PinSetupModal'

type Props = {
  userName: string
  onSignOut: () => void
}

export default function DashboardHeader({ userName, onSignOut }: Props) {
  const [showPinModal, setShowPinModal] = useState(false)
  const [hasPin, setHasPin] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function fetchPinStatus() {
      try {
        const response = await fetch('/api/user/pin/status')
        if (response.ok && !cancelled) {
          const data = await response.json()
          setHasPin(data.hasPin)
        }
      } catch {
        // Ignore errors
      }
    }
    fetchPinStatus()
    return () => { cancelled = true }
  }, [])

  async function refreshPinStatus() {
    try {
      const response = await fetch('/api/user/pin/status')
      if (response.ok) {
        const data = await response.json()
        setHasPin(data.hasPin)
      }
    } catch {
      // Ignore errors
    }
  }

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Classroom Check-In
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">
            Welcome, {userName}
          </span>
          <button
            onClick={() => setShowPinModal(true)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={onSignOut}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Sign out
          </button>
        </div>
      </div>

      <PinSetupModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        hasExistingPin={hasPin}
        onPinUpdated={refreshPinStatus}
      />
    </header>
  )
}
