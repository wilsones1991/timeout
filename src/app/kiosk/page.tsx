'use client'

import { useEffect } from 'react'
import { useKioskSession } from '@/hooks/useKioskSession'
import AuthOverlay from '@/components/kiosk/AuthOverlay'

export default function KioskLandingPage() {
  const { isLoading, isAuthenticated, user, classrooms, login, logout, error } =
    useKioskSession()

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[Kiosk] Service worker registered:', registration.scope)
        })
        .catch((error) => {
          console.error('[Kiosk] Service worker registration failed:', error)
        })
    }
  }, [])

  // Navigate to classroom kiosk using replaceState (no history)
  function handleSelectClassroom(classroomId: string) {
    // Use replaceState to avoid adding to browser history
    window.history.replaceState(null, '', `/kiosk/${classroomId}`)
    // Force re-render by reloading the page in PWA-safe way
    window.location.replace(`/kiosk/${classroomId}`)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <svg
            className="animate-spin h-12 w-12 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
          >
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
          <p className="text-xl">Loading...</p>
        </div>
      </div>
    )
  }

  // Auth overlay if not authenticated
  if (!isAuthenticated) {
    return (
      <AuthOverlay onSuccess={() => {}} login={login} error={error} />
    )
  }

  // Classroom selection
  return (
    <div className="min-h-screen min-h-[100dvh] bg-gray-900 flex flex-col kiosk-safe-area">
      <header className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex-1" />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Select Classroom</h1>
            {user && (
              <p className="text-gray-400 mt-1">
                Signed in as {user.name || user.email}
              </p>
            )}
          </div>
          <div className="flex-1 flex justify-end">
            <button
              onClick={() => logout()}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        {classrooms.length === 0 ? (
          <div className="text-center text-gray-400 mt-12">
            <svg
              className="h-16 w-16 mx-auto mb-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <p className="text-xl mb-2">No classrooms found</p>
            <p className="text-sm">
              Please create a classroom in the dashboard first.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 max-w-md mx-auto">
            {classrooms.map((classroom) => (
              <button
                key={classroom.id}
                onClick={() => handleSelectClassroom(classroom.id)}
                className="w-full p-6 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-left transition-colors"
              >
                <h2 className="text-xl font-semibold text-white">
                  {classroom.name}
                </h2>
                <p className="text-gray-400 mt-1 text-sm">
                  Tap to start kiosk mode
                </p>
              </button>
            ))}
          </div>
        )}
      </main>

      <footer className="p-4 border-t border-gray-800 text-center">
        <p className="text-gray-500 text-sm">
          This device will be used as a check-in kiosk
        </p>
      </footer>
    </div>
  )
}
