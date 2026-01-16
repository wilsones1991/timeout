'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import QRScanner from '@/components/QRScanner'
import PinEntryModal from '@/components/PinEntryModal'

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

type Props = {
  params: Promise<{ id: string }>
}

export default function CheckInKioskPage({ params }: Props) {
  const { id: classroomId } = use(params)
  const router = useRouter()

  const [classroom, setClassroom] = useState<ClassroomInfo | null>(null)
  const [student, setStudent] = useState<StudentInfo | null>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [waitlistConfirmation, setWaitlistConfirmation] = useState<{ message: string; position: number } | null>(null)
  const [scannerEnabled, setScannerEnabled] = useState(true)
  const [isLocked, setIsLocked] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinAction, setPinAction] = useState<'lock' | 'unlock' | 'back' | null>(null)
  const [hasPin, setHasPin] = useState(false)

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
    checkPinStatus()
  }, [])

  // Fetch classroom info and verify session
  useEffect(() => {
    async function loadClassroom() {
      try {
        const response = await fetch(`/api/classroom/${classroomId}/kiosk`)
        if (response.status === 401) {
          router.push('/login')
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
    }

    loadClassroom()
  }, [classroomId, router])

  // Poll for queue updates
  useEffect(() => {
    if (!classroom) return

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
  }, [classroom, classroomId])

  // Auto-reset after showing confirmation
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

  // Auto-reset after showing waitlist confirmation
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

  const handleScan = useCallback(async (cardId: string) => {
    if (isProcessing || confirmation) return

    setScannerEnabled(false)
    setError(null)

    try {
      const response = await fetch(`/api/classroom/${classroomId}/lookup?cardId=${encodeURIComponent(cardId)}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Student not found')
      }

      const data = await response.json()
      setStudent(data.student)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to look up student')
      // Re-enable scanner after error
      setTimeout(() => {
        setError(null)
        setScannerEnabled(true)
      }, 3000)
    }
  }, [classroomId, isProcessing, confirmation])

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
          destination
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to process checkout')
      }

      const data = await response.json()
      setQueue(data.queue || [])

      // Check if added to waitlist
      if (data.waitlisted) {
        setWaitlistConfirmation({
          message: `${student.firstName} added to waitlist for ${destination}`,
          position: data.position
        })
      } else {
        setConfirmation(`${student.firstName} → ${destination}`)
      }

      // Refresh destinations to update counts
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
          action: 'in'
        })
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

  function handleLockAttempt() {
    if (!hasPin) {
      setIsLocked(true)
      setScannerEnabled(false)
      return
    }
    setPinAction('lock')
    setShowPinModal(true)
  }

  function handleUnlockAttempt() {
    if (!hasPin) {
      setIsLocked(false)
      setScannerEnabled(true)
      return
    }
    setPinAction('unlock')
    setShowPinModal(true)
  }

  function handleBackAttempt() {
    if (!hasPin) {
      router.push('/dashboard')
      return
    }
    setPinAction('back')
    setShowPinModal(true)
  }

  function handlePinSuccess() {
    setShowPinModal(false)
    if (pinAction === 'lock') {
      setIsLocked(true)
      setScannerEnabled(false)
    } else if (pinAction === 'unlock') {
      setIsLocked(false)
      setScannerEnabled(true)
    } else if (pinAction === 'back') {
      router.push('/dashboard')
    }
    setPinAction(null)
  }

  function handlePinCancel() {
    setShowPinModal(false)
    setPinAction(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <svg className="animate-spin h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-xl">Loading...</p>
        </div>
      </div>
    )
  }

  if (error && !student) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-500/20 border border-red-500 rounded-2xl p-8 max-w-md text-center">
          <svg className="h-16 w-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-red-200">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-6 px-6 py-3 bg-white text-gray-900 rounded-lg font-medium"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Confirmation screen
  if (confirmation) {
    return (
      <div className="min-h-screen bg-green-600 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <svg className="h-24 w-24 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
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
      <div className="min-h-screen bg-yellow-500 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <svg className="h-24 w-24 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-4xl font-bold mb-2">{waitlistConfirmation.message}</h1>
          <p className="text-2xl mb-4">Position #{waitlistConfirmation.position}</p>
          <p className="text-xl text-yellow-100">You will be notified when it is your turn</p>
        </div>
      </div>
    )
  }

  // Student action screen
  if (student) {
    const isOut = student.status === 'out'
    const waitlistStatus = student.waitlistStatus

    // Student is approved from waitlist - show approval screen
    if (waitlistStatus?.status === 'approved') {
      return (
        <div className="min-h-screen bg-green-600 flex flex-col">
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
                <p className="text-xl">Ready to go to {waitlistStatus.destination}</p>
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
                    <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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
        <div className="min-h-screen bg-yellow-500 flex flex-col">
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
                <p className="text-xl mb-2">Waiting for {waitlistStatus.destination}</p>
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

    return (
      <div className={`min-h-screen ${isOut ? 'bg-amber-600' : 'bg-blue-600'} flex flex-col`}>
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
              /* Check IN screen - student is currently out */
              <>
                <div className="mb-6 p-4 bg-white/20 rounded-2xl">
                  <p className="text-lg">You are checked out</p>
                  {student.checkOutTime && (
                    <p className="text-sm text-white/80">
                      Since {new Date(student.checkOutTime).toLocaleTimeString()}
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
                      <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'CHECK IN'
                  )}
                </button>
              </>
            ) : (
              /* Check OUT screen - show destination buttons */
              <>
                <p className="text-xl mb-6">Where are you going?</p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {destinations.map(dest => {
                    // At capacity if currently out + approved reservations >= capacity
                    const atCapacity = dest.capacity && (dest.currentCount + dest.approvedCount) >= dest.capacity
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
                          <svg className="animate-spin h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
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
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="p-4 border-b border-gray-800 flex items-center justify-between">
        <button
          onClick={handleBackAttempt}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
          title="Back to Dashboard"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">{classroom?.name}</h1>
          <p className="text-gray-400 text-sm">Scan your QR code to check in or out</p>
        </div>
        <button
          onClick={handleLockAttempt}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
          title="Lock Kiosk"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </button>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row">
        {/* Scanner Section */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-lg">
            <QRScanner onScan={handleScan} isEnabled={scannerEnabled} />

            {error && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-center">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Queue Section */}
        <div className="lg:w-80 bg-gray-800 border-t lg:border-t-0 lg:border-l border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white">
              Currently Out
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({queue.length})
              </span>
            </h2>
          </div>

          <div className="overflow-y-auto max-h-[40vh] lg:max-h-[calc(100vh-120px)]">
            {queue.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No students out
              </div>
            ) : (
              <ul className="divide-y divide-gray-700">
                {queue.map(item => (
                  <li
                    key={item.id}
                    className={`p-4 ${
                      item.durationMinutes > 15 ? 'bg-red-900/30' : ''
                    }`}
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
                      <span>{new Date(item.checkOutAt).toLocaleTimeString()}</span>
                      <span className={item.durationMinutes > 15 ? 'text-red-400 font-medium' : ''}>
                        {item.durationMinutes} min
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>

      {/* Lock Screen Overlay */}
      {isLocked && (
        <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-40">
          <div className="text-center">
            <svg className="w-24 h-24 mx-auto mb-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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
        title={pinAction === 'lock' ? 'Enter PIN to Lock' : pinAction === 'unlock' ? 'Enter PIN to Unlock' : 'Enter PIN to Exit'}
        description={pinAction === 'lock' ? 'Enter your PIN to lock the kiosk' : pinAction === 'unlock' ? 'Enter your PIN to unlock the kiosk' : 'Enter your PIN to return to dashboard'}
      />
    </div>
  )
}
