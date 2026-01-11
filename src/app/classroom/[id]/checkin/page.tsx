'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import QRScanner from '@/components/QRScanner'

type StudentInfo = {
  id: string
  firstName: string
  lastName: string
  cardId: string
  status: 'in' | 'out'
  checkOutTime?: string
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
  durationMinutes: number
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
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [scannerEnabled, setScannerEnabled] = useState(true)

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

  async function handleCheckInOut() {
    if (!student || isProcessing) return

    setIsProcessing(true)
    setError(null)

    try {
      const action = student.status === 'in' ? 'out' : 'in'
      const response = await fetch(`/api/classroom/${classroomId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          action
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to process check-in/out')
      }

      const data = await response.json()
      setQueue(data.queue || [])
      setConfirmation(
        action === 'out'
          ? `${student.firstName} checked out`
          : `${student.firstName} checked in`
      )
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

  // Student action screen
  if (student) {
    const isOut = student.status === 'out'

    return (
      <div className={`min-h-screen ${isOut ? 'bg-amber-600' : 'bg-blue-600'} flex flex-col`}>
        <header className="p-4 text-center">
          <h1 className="text-2xl font-bold text-white">{classroom?.name}</h1>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-white max-w-lg w-full">
            <div className="mb-8">
              <p className="text-xl mb-2">Welcome,</p>
              <h2 className="text-5xl font-bold">
                {student.firstName} {student.lastName}
              </h2>
            </div>

            <div className="mb-8 p-6 bg-white/20 rounded-2xl">
              <p className="text-lg mb-2">You are currently:</p>
              <p className="text-4xl font-bold">
                {isOut ? 'CHECKED OUT' : 'CHECKED IN'}
              </p>
              {isOut && student.checkOutTime && (
                <p className="text-lg mt-2 text-white/80">
                  Since {new Date(student.checkOutTime).toLocaleTimeString()}
                </p>
              )}
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/50 rounded-lg text-white">
                {error}
              </div>
            )}

            <button
              onClick={handleCheckInOut}
              disabled={isProcessing}
              className={`w-full py-6 text-2xl font-bold rounded-2xl transition-all ${
                isOut
                  ? 'bg-green-500 hover:bg-green-400 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </span>
              ) : isOut ? (
                'CHECK IN'
              ) : (
                'CHECK OUT'
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

  // Scanner screen (default)
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="p-4 text-center border-b border-gray-800">
        <h1 className="text-2xl font-bold text-white">{classroom?.name}</h1>
        <p className="text-gray-400">Scan your QR code to check in or out</p>
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
    </div>
  )
}
