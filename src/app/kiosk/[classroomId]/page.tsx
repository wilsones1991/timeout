'use client'

import { useState, useEffect, useCallback, use, useRef } from 'react'
import QRScanner, {
  type CameraDevice,
  type SelectionMode,
  type FacingMode,
} from '@/components/QRScanner'
import PinEntryModal from '@/components/PinEntryModal'
import AuthOverlay from '@/components/kiosk/AuthOverlay'
import { useWaitlist } from '@/hooks/useWaitlist'

// Session check interval (5 minutes)
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000

type WaitlistStatus = {
  status: 'waiting' | 'approved'
  destination: string
  position: number
  approvedAt: string | null
}

type StudentInfo = {
  id: string
  firstName: string
  lastName: string
  cardId: string
  status: 'in' | 'out'
  checkOutTime?: string
  waitlistStatus?: WaitlistStatus | null
}

type ClassroomInfo = {
  id: string
  name: string
}

type QueueItem = {
  id: string
  studentId: string
  studentName: string
  checkOutAt: string
  destination: string | null
  durationMinutes: number
}

type Destination = {
  id: string
  name: string
  capacity: number | null
  currentCount: number
  approvedCount: number
  waitlistCount: number
}

type User = {
  id: string
  email: string
  name: string | null
}

type Props = {
  params: Promise<{ classroomId: string }>
}

export default function KioskPage({ params }: Props) {
  const { classroomId } = use(params)

  // Session state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [, setUser] = useState<User | null>(null)
  const [isSessionExpired, setIsSessionExpired] = useState(false)
  const sessionCheckRef = useRef<NodeJS.Timeout | null>(null)

  // Waitlist data
  const { entries: waitlistEntries, byDestination: waitlistByDestination } =
    useWaitlist(classroomId, { pollInterval: 5000 })

  // Kiosk state
  const [classroom, setClassroom] = useState<ClassroomInfo | null>(null)
  const [student, setStudent] = useState<StudentInfo | null>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [waitlistConfirmation, setWaitlistConfirmation] = useState<{
    message: string
    position: number
  } | null>(null)
  const [scannerEnabled, setScannerEnabled] = useState(true)
  const [cameraActive, setCameraActive] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinAction, setPinAction] = useState<
    'lock' | 'unlock' | 'settings' | 'back' | null
  >(null)
  const [hasPin, setHasPin] = useState(false)
  const [showCameraSettings, setShowCameraSettings] = useState(false)
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [cameraSelectionMode, setCameraSelectionMode] =
    useState<SelectionMode>('none')
  const [selectedCamera, setSelectedCamera] = useState<{
    facingMode?: FacingMode
    deviceId?: string
  }>({})

  // Camera timeout
  const CAMERA_TIMEOUT = 60000 // 60 seconds

  // Check session status
  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/kiosk/session')
      const data = await response.json()

      if (data.authenticated) {
        setIsAuthenticated(true)
        setUser(data.user)
        setIsSessionExpired(false)
        return true
      } else {
        setIsAuthenticated(false)
        setUser(null)
        if (isAuthenticated === true) {
          setIsSessionExpired(true)
        }
        return false
      }
    } catch (error) {
      console.error('[Kiosk] Session check failed:', error)
      return false
    }
  }, [isAuthenticated])

  // Login function for auth overlay
  const login = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch('/api/kiosk/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })

        const data = await response.json()

        if (!response.ok) {
          return { success: false, error: data.error }
        }

        setUser(data.user)
        setIsAuthenticated(true)
        setIsSessionExpired(false)
        return { success: true }
      } catch {
        return { success: false, error: 'An error occurred during login' }
      }
    },
    []
  )

  // Load classroom data
  const loadClassroom = useCallback(async () => {
    try {
      const response = await fetch(`/api/classroom/${classroomId}/kiosk`)
      if (response.status === 401) {
        setIsAuthenticated(false)
        setIsLoading(false)
        return
      }
      if (!response.ok) {
        throw new Error('Classroom not found')
      }
      const data = await response.json()
      setClassroom(data.classroom)
      setQueue(data.queue || [])
      setDestinations(data.destinations || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load classroom')
    } finally {
      setIsLoading(false)
    }
  }, [classroomId])

  // Initial session check
  useEffect(() => {
    checkSession().then((authenticated) => {
      if (authenticated) {
        // Load classroom data
        loadClassroom()
      } else {
        setIsLoading(false)
      }
    })
  }, [checkSession, loadClassroom])

  // Periodic session check
  useEffect(() => {
    if (!isAuthenticated) {
      if (sessionCheckRef.current) {
        clearInterval(sessionCheckRef.current)
        sessionCheckRef.current = null
      }
      return
    }

    sessionCheckRef.current = setInterval(() => {
      checkSession()
    }, SESSION_CHECK_INTERVAL)

    return () => {
      if (sessionCheckRef.current) {
        clearInterval(sessionCheckRef.current)
        sessionCheckRef.current = null
      }
    }
  }, [isAuthenticated, checkSession])

  // Auto-deactivate camera after inactivity
  useEffect(() => {
    if (!cameraActive || !scannerEnabled) return

    const timer = setTimeout(() => {
      setCameraActive(false)
    }, CAMERA_TIMEOUT)

    return () => clearTimeout(timer)
  }, [cameraActive, scannerEnabled])

  // Detect available cameras on mount
  useEffect(() => {
    async function detectCameras() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter((d) => d.kind === 'videoinput')

        const isMobile =
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          )
        const hasMultipleCameras = videoDevices.length > 1

        if (hasMultipleCameras) {
          const detectedCameras: CameraDevice[] = videoDevices.map((d) => ({
            id: d.deviceId,
            label: d.label || `Camera ${videoDevices.indexOf(d) + 1}`,
          }))
          const selectionMode: SelectionMode = isMobile ? 'flip' : 'dropdown'
          setCameras(detectedCameras)
          setCameraSelectionMode(selectionMode)
        }
      } catch {
        // Camera enumeration may fail without permissions
      }
    }
    detectCameras()
  }, [])

  // Restore locked state from localStorage
  useEffect(() => {
    const storageKey = `kiosk-locked-${classroomId}`
    const savedLocked = localStorage.getItem(storageKey)
    if (savedLocked === 'true') {
      setIsLocked(true)
      setScannerEnabled(false)
      setCameraActive(false)
    }
  }, [classroomId])

  // Check if user has PIN set
  useEffect(() => {
    async function checkPinStatus() {
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
    if (isAuthenticated) {
      checkPinStatus()
    }
  }, [isAuthenticated])

  // Poll for queue updates
  useEffect(() => {
    if (!classroom || !isAuthenticated) return

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/classroom/${classroomId}/queue`)
        if (response.ok) {
          const data = await response.json()
          setQueue(data.queue || [])
        }
      } catch {
        // Ignore polling errors
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [classroom, classroomId, isAuthenticated])

  // Auto-reset after confirmation
  useEffect(() => {
    if (confirmation) {
      const timer = setTimeout(() => {
        setConfirmation(null)
        setStudent(null)
        setScannerEnabled(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [confirmation])

  // Auto-reset after waitlist confirmation
  useEffect(() => {
    if (waitlistConfirmation) {
      const timer = setTimeout(() => {
        setWaitlistConfirmation(null)
        setStudent(null)
        setScannerEnabled(true)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [waitlistConfirmation])

  // Auto-reset after inactivity on student screen
  useEffect(() => {
    if (student && !isProcessing && !confirmation) {
      const timer = setTimeout(() => {
        setStudent(null)
        setScannerEnabled(true)
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [student, isProcessing, confirmation])

  const handleCamerasDetected = useCallback(
    (detectedCameras: CameraDevice[], selectionMode: SelectionMode) => {
      setCameras(detectedCameras)
      setCameraSelectionMode(selectionMode)

      const STORAGE_KEY = 'qr-scanner-camera-preference'
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const pref = JSON.parse(stored)
          if (selectionMode === 'flip' && pref.facingMode) {
            setSelectedCamera({ facingMode: pref.facingMode })
          } else if (
            selectionMode === 'dropdown' &&
            pref.deviceId &&
            detectedCameras.some((c) => c.id === pref.deviceId)
          ) {
            setSelectedCamera({ deviceId: pref.deviceId })
          } else if (selectionMode === 'dropdown' && detectedCameras.length > 0) {
            setSelectedCamera({ deviceId: detectedCameras[0].id })
          }
        } else if (selectionMode === 'dropdown' && detectedCameras.length > 0) {
          setSelectedCamera({ deviceId: detectedCameras[0].id })
        }
      } catch {
        if (selectionMode === 'dropdown' && detectedCameras.length > 0) {
          setSelectedCamera({ deviceId: detectedCameras[0].id })
        }
      }
    },
    []
  )

  const handleScan = useCallback(
    async (cardId: string) => {
      if (isProcessing || confirmation) return

      setScannerEnabled(false)
      setError(null)

      try {
        const response = await fetch(
          `/api/classroom/${classroomId}/lookup?cardId=${encodeURIComponent(cardId)}`
        )

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Student not found')
        }

        const data = await response.json()
        setStudent(data.student)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to look up student')
        setTimeout(() => {
          setError(null)
          setScannerEnabled(true)
        }, 3000)
      }
    },
    [classroomId, isProcessing, confirmation]
  )

  async function handleCheckOut(destination: string) {
    if (!student || isProcessing) return

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/classroom/${classroomId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          action: 'out',
          destination,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to process checkout')
      }

      const data = await response.json()
      setQueue(data.queue || [])

      if (data.waitlisted) {
        setWaitlistConfirmation({
          message: `${student.firstName} added to waitlist for ${destination}`,
          position: data.position,
        })
      } else {
        setConfirmation(`${student.firstName} → ${destination}`)
      }

      // Refresh destinations
      const kioskResponse = await fetch(`/api/classroom/${classroomId}/kiosk`)
      if (kioskResponse.ok) {
        const kioskData = await kioskResponse.json()
        setDestinations(kioskData.destinations || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process')
      setScannerEnabled(true)
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleCheckIn() {
    if (!student || isProcessing) return

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/classroom/${classroomId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          action: 'in',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to process check-in')
      }

      const data = await response.json()
      setQueue(data.queue || [])
      setConfirmation(`${student.firstName} checked in`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process')
      setScannerEnabled(true)
    } finally {
      setIsProcessing(false)
    }
  }

  function handleCancel() {
    setStudent(null)
    setError(null)
    setScannerEnabled(true)
  }

  const storageKey = `kiosk-locked-${classroomId}`

  function handleLockAttempt() {
    if (!hasPin) {
      setIsLocked(true)
      setScannerEnabled(false)
      setCameraActive(false)
      localStorage.setItem(storageKey, 'true')
      return
    }
    setPinAction('lock')
    setShowPinModal(true)
  }

  function handleUnlockAttempt() {
    if (!hasPin) {
      setIsLocked(false)
      setScannerEnabled(true)
      localStorage.removeItem(storageKey)
      return
    }
    setPinAction('unlock')
    setShowPinModal(true)
  }

  function handlePinSuccess() {
    setShowPinModal(false)
    if (pinAction === 'lock') {
      setIsLocked(true)
      setScannerEnabled(false)
      setCameraActive(false)
      localStorage.setItem(storageKey, 'true')
    } else if (pinAction === 'unlock') {
      setIsLocked(false)
      setScannerEnabled(true)
      localStorage.removeItem(storageKey)
    } else if (pinAction === 'settings') {
      setShowCameraSettings(true)
      setCameraActive(true)
    } else if (pinAction === 'back') {
      window.history.replaceState(null, '', '/kiosk')
      window.location.replace('/kiosk')
      return
    }
    setPinAction(null)
  }

  function handlePinCancel() {
    setShowPinModal(false)
    setPinAction(null)
  }

  function handleSettingsAttempt() {
    if (!hasPin) {
      setShowCameraSettings(true)
      setCameraActive(true)
      return
    }
    setPinAction('settings')
    setShowPinModal(true)
  }

  function handleBackAttempt() {
    if (!hasPin) {
      window.history.replaceState(null, '', '/kiosk')
      window.location.replace('/kiosk')
      return
    }
    setPinAction('back')
    setShowPinModal(true)
  }

  function saveCameraPreference(pref: {
    facingMode?: FacingMode
    deviceId?: string
  }) {
    const STORAGE_KEY = 'qr-scanner-camera-preference'
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pref))
    } catch {
      // Ignore errors
    }
  }

  function handleCameraSettingChange(value: string) {
    if (cameraSelectionMode === 'flip') {
      const newMode = value as FacingMode
      setSelectedCamera({ facingMode: newMode })
      saveCameraPreference({ facingMode: newMode })
    } else {
      setSelectedCamera({ deviceId: value })
      saveCameraPreference({ deviceId: value })
    }
  }

  // Loading state
  if (isLoading || isAuthenticated === null) {
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

  // Auth overlay when not authenticated
  if (!isAuthenticated) {
    return (
      <AuthOverlay
        onSuccess={() => {
          loadClassroom()
        }}
        login={login}
        isSessionExpired={isSessionExpired}
      />
    )
  }

  // Error state
  if (error && !student && !classroom) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-gray-900 flex items-center justify-center p-4 kiosk-safe-area">
        <div className="bg-red-500/20 border border-red-500 rounded-2xl p-8 max-w-md text-center">
          <svg
            className="h-16 w-16 mx-auto mb-4 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-red-200">{error}</p>
          <button
            onClick={() => {
              window.history.replaceState(null, '', '/kiosk')
              window.location.href = '/kiosk'
            }}
            className="mt-6 px-6 py-3 bg-white text-gray-900 rounded-lg font-medium"
          >
            Return to Classroom Selection
          </button>
        </div>
      </div>
    )
  }

  // Confirmation screen
  if (confirmation) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-green-600 flex items-center justify-center p-4 kiosk-safe-area">
        <div className="text-center text-white">
          <svg
            className="h-24 w-24 mx-auto mb-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <h1 className="text-4xl font-bold mb-2">{confirmation}</h1>
          <p className="text-xl text-green-100">Returning to scanner...</p>
        </div>
      </div>
    )
  }

  // Waitlist confirmation screen
  if (waitlistConfirmation) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-yellow-500 flex items-center justify-center p-4 kiosk-safe-area">
        <div className="text-center text-white">
          <svg
            className="h-24 w-24 mx-auto mb-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h1 className="text-4xl font-bold mb-2">
            {waitlistConfirmation.message}
          </h1>
          <p className="text-2xl mb-4">
            Position #{waitlistConfirmation.position}
          </p>
          <p className="text-xl text-yellow-100">
            You will be notified when it is your turn
          </p>
        </div>
      </div>
    )
  }

  // Student action screens
  if (student) {
    const isOut = student.status === 'out'
    const waitlistStatus = student.waitlistStatus

    // Student is approved from waitlist
    if (waitlistStatus?.status === 'approved') {
      return (
        <div className="min-h-screen min-h-[100dvh] bg-green-600 flex flex-col kiosk-safe-area">
          <header className="p-4 text-center">
            <h1 className="text-2xl font-bold text-white">{classroom?.name}</h1>
          </header>

          <main className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-white max-w-xl w-full">
              <div className="mb-6">
                <h2 className="text-4xl font-bold">
                  {student.firstName} {student.lastName}
                </h2>
              </div>

              <div className="mb-6 p-6 bg-white/20 rounded-2xl">
                <p className="text-2xl font-bold mb-2">You are approved!</p>
                <p className="text-xl">
                  Ready to go to {waitlistStatus.destination}
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/50 rounded-lg text-white">
                  {error}
                </div>
              )}

              <button
                onClick={() => handleCheckOut(waitlistStatus.destination)}
                disabled={isProcessing}
                className="w-full py-6 text-2xl font-bold rounded-2xl bg-white text-green-600 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg
                      className="animate-spin h-6 w-6"
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
                    Processing...
                  </span>
                ) : (
                  `GO TO ${waitlistStatus.destination.toUpperCase()}`
                )}
              </button>

              <button
                onClick={handleCancel}
                className="mt-4 text-white/80 hover:text-white text-lg"
              >
                Cancel
              </button>
            </div>
          </main>
        </div>
      )
    }

    // Student is waiting in queue
    if (waitlistStatus?.status === 'waiting') {
      return (
        <div className="min-h-screen min-h-[100dvh] bg-yellow-500 flex flex-col kiosk-safe-area">
          <header className="p-4 text-center">
            <h1 className="text-2xl font-bold text-white">{classroom?.name}</h1>
          </header>

          <main className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-white max-w-xl w-full">
              <div className="mb-6">
                <h2 className="text-4xl font-bold">
                  {student.firstName} {student.lastName}
                </h2>
              </div>

              <div className="mb-6 p-6 bg-white/20 rounded-2xl">
                <p className="text-xl mb-2">
                  Waiting for {waitlistStatus.destination}
                </p>
                <p className="text-5xl font-bold">#{waitlistStatus.position}</p>
                <p className="text-lg mt-2">in line</p>
              </div>

              <p className="text-lg text-yellow-100 mb-6">
                You will be notified when it is your turn
              </p>

              <button
                onClick={handleCancel}
                className="text-white/80 hover:text-white text-lg"
              >
                Done
              </button>
            </div>
          </main>
        </div>
      )
    }

    // Regular check in/out screen
    return (
      <div
        className={`min-h-screen min-h-[100dvh] ${isOut ? 'bg-amber-600' : 'bg-blue-600'} flex flex-col kiosk-safe-area`}
      >
        <header className="p-4 text-center">
          <h1 className="text-2xl font-bold text-white">{classroom?.name}</h1>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-white max-w-xl w-full">
            <div className="mb-6">
              <h2 className="text-4xl font-bold">
                {student.firstName} {student.lastName}
              </h2>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/50 rounded-lg text-white">
                {error}
              </div>
            )}

            {isOut ? (
              <>
                <div className="mb-6 p-4 bg-white/20 rounded-2xl">
                  <p className="text-lg">You are checked out</p>
                  {student.checkOutTime && (
                    <p className="text-sm text-white/80">
                      Since{' '}
                      {new Date(student.checkOutTime).toLocaleTimeString()}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleCheckIn}
                  disabled={isProcessing}
                  className="w-full py-6 text-2xl font-bold rounded-2xl bg-green-500 hover:bg-green-400 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-3">
                      <svg
                        className="animate-spin h-6 w-6"
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
                      Processing...
                    </span>
                  ) : (
                    'CHECK IN'
                  )}
                </button>
              </>
            ) : (
              <>
                <p className="text-xl mb-6">Where are you going?</p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {destinations.map((dest) => {
                    const atCapacity =
                      dest.capacity &&
                      dest.currentCount + dest.approvedCount >= dest.capacity
                    return (
                      <button
                        key={dest.id}
                        onClick={() => handleCheckOut(dest.name)}
                        disabled={isProcessing}
                        className={`py-6 text-xl font-bold rounded-2xl text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                          atCapacity
                            ? 'bg-yellow-600 hover:bg-yellow-500'
                            : 'bg-amber-500 hover:bg-amber-400'
                        }`}
                      >
                        {isProcessing ? (
                          <svg
                            className="animate-spin h-6 w-6 mx-auto"
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
                        ) : (
                          <div>
                            <div>{dest.name}</div>
                            {atCapacity && (
                              <div className="text-sm font-normal mt-1 opacity-90">
                                {dest.waitlistCount > 0
                                  ? `${dest.waitlistCount} waiting`
                                  : 'Will join waitlist'}
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            <button
              onClick={handleCancel}
              className="mt-4 text-white/80 hover:text-white text-lg"
            >
              Cancel
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Scanner screen (default)
  return (
    <div className="h-full bg-gray-900 flex flex-col kiosk-safe-area overflow-hidden">
      <header className="flex-shrink-0 p-4 border-b border-gray-800 flex items-center justify-between">
        <button
          onClick={handleBackAttempt}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
          title="Back to Classroom Selection"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">{classroom?.name}</h1>
          <p className="text-gray-400 text-sm">
            Scan your QR code to check in or out
          </p>
        </div>
        <div className="flex items-center gap-1">
          {cameras.length > 1 && (
            <button
              onClick={handleSettingsAttempt}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
              title="Camera Settings"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          )}
          <button
            onClick={handleLockAttempt}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
            title="Lock Kiosk"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Scanner Section */}
        <div className="flex-1 flex items-center justify-center p-6 min-h-0 overflow-hidden">
          <div className="w-full max-w-lg">
            {cameraActive && !showCameraSettings ? (
              <div className="flex flex-col items-center">
                <QRScanner
                  onScan={handleScan}
                  isEnabled={scannerEnabled}
                  hideControls={true}
                  onCamerasDetected={handleCamerasDetected}
                  selectedCamera={selectedCamera}
                />
                <button
                  onClick={() => setCameraActive(false)}
                  className="mt-4 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium"
                >
                  Cancel
                </button>
              </div>
            ) : !showCameraSettings ? (
              <div className="relative w-full max-w-md mx-auto aspect-square bg-gray-800 rounded-2xl overflow-hidden flex items-center justify-center">
                <button
                  onClick={() => setCameraActive(true)}
                  className="flex flex-col items-center justify-center text-white hover:scale-105 transition-transform"
                >
                  <div className="w-32 h-32 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center mb-6">
                    <svg
                      className="w-16 h-16"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-2xl font-bold">Tap to Scan</p>
                  <p className="text-gray-400 mt-2">Press to activate camera</p>
                </button>
              </div>
            ) : null}

            {error && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-center">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Queue & Waitlist Section */}
        <div className="lg:w-80 lg:flex-shrink-0 bg-gray-800 border-t lg:border-t-0 lg:border-l border-gray-700 overflow-y-auto min-h-0 max-h-[35vh] lg:max-h-full">
          {/* Currently Out */}
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">
              Currently Out
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({queue.length})
              </span>
            </h2>
          </div>

          <div>
            {queue.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No students out
              </div>
            ) : (
              <ul className="divide-y divide-gray-700">
                {queue.map((item) => (
                  <li
                    key={item.id}
                    className={`p-4 ${item.durationMinutes > 15 ? 'bg-red-900/30' : ''}`}
                  >
                    <div className="font-medium text-white">
                      {item.studentName}
                    </div>
                    {item.destination && (
                      <div className="text-sm text-blue-400">
                        {item.destination}
                      </div>
                    )}
                    <div className="text-sm text-gray-400 flex justify-between">
                      <span>
                        {new Date(item.checkOutAt).toLocaleTimeString()}
                      </span>
                      <span
                        className={
                          item.durationMinutes > 15
                            ? 'text-red-400 font-medium'
                            : ''
                        }
                      >
                        {item.durationMinutes} min
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Wait List */}
          {waitlistEntries.length > 0 && (
            <>
              <div className="p-4 border-t border-b border-gray-700 bg-gray-900/50">
                <h2 className="text-lg font-semibold text-yellow-400">
                  Wait List
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    ({waitlistEntries.length})
                  </span>
                </h2>
              </div>

              <div>
                {Object.entries(waitlistByDestination).map(
                  ([destination, destEntries]) => (
                    <div key={destination}>
                      <div className="px-4 py-2 bg-gray-700/50 text-sm font-medium text-gray-300">
                        {destination}
                      </div>
                      <ul className="divide-y divide-gray-700">
                        {destEntries.map((entry) => (
                          <li
                            key={entry.id}
                            className={`p-4 ${entry.status === 'approved' ? 'bg-green-900/30' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold ${
                                  entry.status === 'approved'
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-600 text-gray-200'
                                }`}
                              >
                                {entry.position}
                              </span>
                              <div className="flex-1">
                                <div className="font-medium text-white">
                                  {entry.studentName}
                                </div>
                                {entry.status === 'approved' && (
                                  <div className="text-sm text-green-400 font-medium">
                                    Ready to go!
                                  </div>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Lock Screen Overlay */}
      {isLocked && (
        <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-40">
          <div className="text-center">
            <svg
              className="w-24 h-24 mx-auto mb-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <h1 className="text-3xl font-bold text-white mb-2">Kiosk Locked</h1>
            <p className="text-gray-400 mb-8">{classroom?.name}</p>
            <button
              onClick={handleUnlockAttempt}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white text-xl font-medium rounded-xl"
            >
              Unlock
            </button>
          </div>
        </div>
      )}

      {/* PIN Entry Modal */}
      <PinEntryModal
        isOpen={showPinModal}
        onClose={handlePinCancel}
        onSuccess={handlePinSuccess}
        title={
          pinAction === 'lock'
            ? 'Enter PIN to Lock'
            : pinAction === 'unlock'
              ? 'Enter PIN to Unlock'
              : pinAction === 'back'
                ? 'Enter PIN to Exit'
                : 'Enter PIN for Settings'
        }
        description={
          pinAction === 'lock'
            ? 'Enter your PIN to lock the kiosk'
            : pinAction === 'unlock'
              ? 'Enter your PIN to unlock the kiosk'
              : pinAction === 'back'
                ? 'Enter your PIN to return to classroom selection'
                : 'Enter your PIN to access camera settings'
        }
      />

      {/* Camera Settings Panel */}
      {showCameraSettings && (
        <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Camera Settings</h2>
            <button
              onClick={() => setShowCameraSettings(false)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
            >
              <svg
                className="w-6 h-6"
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

          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            <div className="flex-1 flex items-center justify-center p-4 md:p-6 bg-black">
              <div className="w-full max-w-md">
                <QRScanner
                  scannerId="qr-reader-settings"
                  onScan={() => {}}
                  isEnabled={true}
                  hideControls={true}
                  onCamerasDetected={handleCamerasDetected}
                  selectedCamera={selectedCamera}
                />
                <p className="text-center text-gray-400 mt-4 text-sm">
                  Camera Preview
                </p>
              </div>
            </div>

            <div className="md:w-80 bg-gray-800 p-6 overflow-y-auto border-t md:border-t-0 md:border-l border-gray-700">
              <p className="text-gray-400 text-sm mb-4">
                Select a camera to see the preview update:
              </p>

              {cameraSelectionMode === 'flip' ? (
                <div className="space-y-3">
                  <button
                    onClick={() => handleCameraSettingChange('user')}
                    className={`w-full p-4 rounded-xl flex items-center gap-4 transition-colors ${
                      selectedCamera.facingMode === 'user' ||
                      !selectedCamera.facingMode
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <div className="text-left">
                      <div className="font-medium">Front Camera</div>
                      <div className="text-sm opacity-75">Facing you</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleCameraSettingChange('environment')}
                    className={`w-full p-4 rounded-xl flex items-center gap-4 transition-colors ${
                      selectedCamera.facingMode === 'environment'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <div className="text-left">
                      <div className="font-medium">Rear Camera</div>
                      <div className="text-sm opacity-75">Facing away</div>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cameras.map((camera) => (
                    <button
                      key={camera.id}
                      onClick={() => handleCameraSettingChange(camera.id)}
                      className={`w-full p-4 rounded-xl flex items-center gap-4 transition-colors ${
                        selectedCamera.deviceId === camera.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <svg
                        className="w-8 h-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      <div className="text-left">
                        <div className="font-medium">{camera.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowCameraSettings(false)}
                className="w-full mt-6 p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
