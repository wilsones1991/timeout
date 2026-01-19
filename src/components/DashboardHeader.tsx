'use client'

import { useState, useEffect } from 'react'
import PinSetupModal from './PinSetupModal'
import PasskeyManagementModal from './PasskeyManagementModal'

type Props = {
  userName: string
  onSignOut: () => void
}

export default function DashboardHeader({ userName, onSignOut }: Props) {
  const [showPinModal, setShowPinModal] = useState(false)
  const [showPasskeyModal, setShowPasskeyModal] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
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
          <div className="relative">
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            {showSettingsMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSettingsMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={() => {
                      setShowSettingsMenu(false)
                      setShowPinModal(true)
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    {hasPin ? 'Manage PIN' : 'Set Up PIN'}
                  </button>
                  <button
                    onClick={() => {
                      setShowSettingsMenu(false)
                      setShowPasskeyModal(true)
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                    </svg>
                    Manage Passkeys
                  </button>
                </div>
              </>
            )}
          </div>
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

      <PasskeyManagementModal
        isOpen={showPasskeyModal}
        onClose={() => setShowPasskeyModal(false)}
      />
    </header>
  )
}
