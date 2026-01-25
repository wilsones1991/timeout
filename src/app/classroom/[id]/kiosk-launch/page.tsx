'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  params: Promise<{ id: string }>
}

export default function KioskLaunchPage({ params }: Props) {
  const { id: classroomId } = use(params)
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'opening' | 'opened' | 'error'>('checking')
  const [classroomName, setClassroomName] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    async function checkAuthAndLaunch() {
      try {
        // Check if authenticated by hitting the kiosk API
        const response = await fetch(`/api/classroom/${classroomId}/kiosk`)

        if (response.status === 401) {
          // Not authenticated - redirect to login with return URL
          const returnUrl = encodeURIComponent(`/classroom/${classroomId}/kiosk-launch`)
          router.push(`/login?callbackUrl=${returnUrl}`)
          return
        }

        if (!response.ok) {
          throw new Error('Classroom not found')
        }

        const data = await response.json()
        setClassroomName(data.classroom?.name || 'Classroom')
        setStatus('opening')

        // Enable kiosk mode to restrict access to other parts of the app
        await fetch('/api/kiosk-mode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'enable' })
        })

        // Open kiosk in popup window with browser chrome hidden
        const kioskUrl = `/classroom/${classroomId}/checkin?popup=true`
        const popup = window.open(
          kioskUrl,
          `kiosk-${classroomId}`,
          'width=1024,height=768,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes'
        )

        if (popup) {
          setStatus('opened')
          // Focus the popup
          popup.focus()
        } else {
          // Popup was blocked
          setError('Popup was blocked. Please allow popups for this site and try again.')
          setStatus('error')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to launch kiosk')
        setStatus('error')
      }
    }

    checkAuthAndLaunch()
  }, [classroomId, router])

  function handleRetry() {
    setStatus('checking')
    setError('')
    // Re-trigger the effect by reloading
    window.location.reload()
  }

  function handleOpenManually() {
    const kioskUrl = `/classroom/${classroomId}/checkin?popup=true`
    const popup = window.open(
      kioskUrl,
      `kiosk-${classroomId}`,
      'width=1024,height=768,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes'
    )
    if (popup) {
      setStatus('opened')
      popup.focus()
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {status === 'checking' && (
          <>
            <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <h1 className="text-xl font-semibold text-gray-900">Checking authentication...</h1>
          </>
        )}

        {status === 'opening' && (
          <>
            <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <h1 className="text-xl font-semibold text-gray-900">Opening Kiosk...</h1>
            <p className="text-gray-600 mt-2">{classroomName}</p>
          </>
        )}

        {status === 'opened' && (
          <>
            <svg className="h-16 w-16 mx-auto mb-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <h1 className="text-xl font-semibold text-gray-900">Kiosk Opened</h1>
            <p className="text-gray-600 mt-2">{classroomName}</p>
            <p className="text-sm text-gray-500 mt-4">
              The kiosk should now be open in a new window.
            </p>
            <div className="mt-6 space-y-3">
              <button
                onClick={handleOpenManually}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
              >
                Open Again
              </button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <svg className="h-16 w-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h1 className="text-xl font-semibold text-gray-900">Could Not Open Kiosk</h1>
            <p className="text-red-600 mt-2">{error}</p>

            {error.includes('Popup') && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left text-sm">
                <p className="font-medium text-yellow-800">To allow popups:</p>
                <ol className="mt-2 text-yellow-700 list-decimal list-inside space-y-1">
                  <li>Click the popup blocked icon in your address bar</li>
                  <li>Select &quot;Always allow popups from this site&quot;</li>
                  <li>Click the button below to try again</li>
                </ol>
              </div>
            )}

            <div className="mt-6 space-y-3">
              <button
                onClick={handleOpenManually}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
              >
                Try Opening Manually
              </button>
              <button
                onClick={handleRetry}
                className="w-full px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Retry
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
