'use client'

import { useState, useEffect, useCallback } from 'react'
import StudentModal from './StudentModal'
import CSVUploadModal from './CSVUploadModal'
import QRCardsModal from './QRCardsModal'

type Student = {
  id: string
  firstName: string
  lastName: string
  cardId: string
  enrolledAt: string
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
  currentCount?: number
  approvedCount?: number
}

type WaitlistEntry = {
  id: string
  destination: string
  position: number
  status: 'waiting' | 'approved'
}

type Props = {
  classroomId: string
  classroomName: string
}

export default function StudentList({ classroomId, classroomName }: Props) {
  const [students, setStudents] = useState<Student[]>([])
  const [checkedOutStudents, setCheckedOutStudents] = useState<Map<string, string | null>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false)
  const [isQRModalOpen, setIsQRModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [processingCheckIn, setProcessingCheckIn] = useState<string | null>(null)
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [checkoutStudent, setCheckoutStudent] = useState<Student | null>(null)
  const [waitingStudents, setWaitingStudents] = useState<Map<string, WaitlistEntry>>(new Map())

  const fetchStudents = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/classrooms/${classroomId}/students`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch students')
      }

      setStudents(data.students)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students')
    } finally {
      setIsLoading(false)
    }
  }, [classroomId])

  const fetchQueue = useCallback(async () => {
    try {
      const response = await fetch(`/api/classroom/${classroomId}/queue`)
      if (response.ok) {
        const data = await response.json()
        const checkedOut = new Map<string, string | null>(
          (data.queue || []).map((item: QueueItem) => [item.studentId, item.destination])
        )
        setCheckedOutStudents(checkedOut)
      }
    } catch {
      // Ignore queue fetch errors
    }
  }, [classroomId])

  const fetchDestinations = useCallback(async () => {
    try {
      // Fetch from kiosk endpoint to get capacity usage info
      const response = await fetch(`/api/classroom/${classroomId}/kiosk`)
      if (response.ok) {
        const data = await response.json()
        setDestinations((data.destinations || []).map((d: { id: string; name: string; capacity: number | null; currentCount: number; approvedCount: number }) => ({
          id: d.id,
          name: d.name,
          capacity: d.capacity,
          currentCount: d.currentCount,
          approvedCount: d.approvedCount
        })))
      }
    } catch {
      // Ignore destination fetch errors - will fall back to no selection
    }
  }, [classroomId])

  const fetchWaitlist = useCallback(async () => {
    try {
      const response = await fetch(`/api/classroom/${classroomId}/waitlist`)
      if (response.ok) {
        const data = await response.json()
        const waiting = new Map<string, WaitlistEntry>()
        for (const entry of data.entries || []) {
          waiting.set(entry.studentId, {
            id: entry.id,
            destination: entry.destinationName,
            position: entry.position,
            status: entry.status
          })
        }
        setWaitingStudents(waiting)
      }
    } catch {
      // Ignore waitlist fetch errors
    }
  }, [classroomId])

  useEffect(() => {
    fetchStudents()
    fetchQueue()
    fetchDestinations()
    fetchWaitlist()
  }, [fetchStudents, fetchQueue, fetchDestinations, fetchWaitlist])

  // Poll for queue, waitlist, and destination updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchQueue()
      fetchWaitlist()
      fetchDestinations()
    }, 10000)
    return () => clearInterval(interval)
  }, [fetchQueue, fetchWaitlist, fetchDestinations])

  async function handleAddStudent(data: { firstName: string; lastName: string }) {
    const response = await fetch(`/api/admin/classrooms/${classroomId}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.error || 'Failed to add student')
    }

    await fetchStudents()
  }

  async function handleUpdateStudent(data: { firstName: string; lastName: string }) {
    if (!editingStudent) return

    const response = await fetch(
      `/api/admin/classrooms/${classroomId}/students/${editingStudent.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }
    )

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.error || 'Failed to update student')
    }

    await fetchStudents()
  }

  async function handleDeleteStudent(studentId: string) {
    try {
      const response = await fetch(
        `/api/admin/classrooms/${classroomId}/students/${studentId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to remove student')
      }

      setStudents(students.filter(s => s.id !== studentId))
      setDeleteConfirm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove student')
    }
  }

  async function handleBulkUpload(studentData: { firstName: string; lastName: string }[]) {
    const response = await fetch(`/api/admin/classrooms/${classroomId}/students/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students: studentData })
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.error || 'Failed to upload students')
    }

    const result = await response.json()
    await fetchStudents()
    return result
  }

  function handleManualCheckInOut(student: Student) {
    const isOut = checkedOutStudents.has(student.id)

    if (isOut) {
      // Check in - no destination needed
      performCheckInOut(student.id, 'in', null)
    } else {
      // Check out - show destination selection if multiple destinations exist
      if (destinations.length > 1) {
        setCheckoutStudent(student)
      } else if (destinations.length === 1) {
        // Only one destination - use it directly
        performCheckInOut(student.id, 'out', destinations[0].name)
      } else {
        // No destinations - checkout without destination
        performCheckInOut(student.id, 'out', null)
      }
    }
  }

  async function performCheckInOut(studentId: string, action: 'in' | 'out', destination: string | null, bypassWaitlist = false) {
    setProcessingCheckIn(studentId)
    setError('')
    setCheckoutStudent(null)

    try {
      const response = await fetch(`/api/classroom/${classroomId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          action,
          destination,
          manualOverride: true,
          bypassWaitlist
        })
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to update check-in status')
      }

      const result = await response.json()

      // If student was added to waitlist, refresh waitlist to get the real entry
      if (result.waitlisted) {
        // Fetch fresh waitlist data to get the entry ID
        fetchWaitlist()
      } else {
        // Update checked out state
        setCheckedOutStudents(prev => {
          const next = new Map(prev)
          if (action === 'out') {
            next.set(studentId, destination)
          } else {
            next.delete(studentId)
          }
          return next
        })
        // Remove from waitlist if they were there
        setWaitingStudents(prev => {
          const next = new Map(prev)
          next.delete(studentId)
          return next
        })
      }

      // Refresh all data to ensure consistency
      fetchQueue()
      fetchWaitlist()
      fetchDestinations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setProcessingCheckIn(null)
    }
  }

  async function handleCancelWaitlist(studentId: string, entryId: string) {
    setProcessingCheckIn(studentId)
    setError('')

    try {
      const response = await fetch(`/api/classroom/${classroomId}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          entryId
        })
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to remove from waitlist')
      }

      // Update local state
      setWaitingStudents(prev => {
        const next = new Map(prev)
        next.delete(studentId)
        return next
      })

      // Refresh waitlist to update positions
      fetchWaitlist()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove from waitlist')
    } finally {
      setProcessingCheckIn(null)
    }
  }

  function openAddModal() {
    setEditingStudent(null)
    setIsModalOpen(true)
  }

  function openEditModal(student: Student) {
    setEditingStudent(student)
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingStudent(null)
  }

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Students</h2>
        <div className="flex gap-2">
          {students.length > 0 && (
            <button
              onClick={() => setIsQRModalOpen(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              QR Cards
            </button>
          )}
          <button
            onClick={() => setIsCSVModalOpen(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Import CSV
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-md"
          >
            Add Student
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
          <button
            onClick={() => setError('')}
            className="ml-2 text-red-800 font-medium hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {students.length === 0 ? (
        <div className="text-center py-12 px-6">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No students yet</h3>
          <p className="text-gray-500 mb-4">
            Add students individually or import from a CSV file.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setIsCSVModalOpen(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Import CSV
            </button>
            <button
              onClick={openAddModal}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-md"
            >
              Add Student
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Card ID
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map(student => {
                const isOut = checkedOutStudents.has(student.id)
                const destination = checkedOutStudents.get(student.id)
                const waitlistEntry = waitingStudents.get(student.id)
                const isProcessing = processingCheckIn === student.id

                // Determine status: Out > Waiting > In
                let statusText = 'In'
                let statusClass = 'bg-emerald-100 text-emerald-800'

                if (isOut) {
                  statusText = destination ? `Out: ${destination}` : 'Out'
                  statusClass = 'bg-amber-100 text-amber-800'
                } else if (waitlistEntry) {
                  statusText = `Waiting: ${waitlistEntry.destination} (#${waitlistEntry.position})`
                  if (waitlistEntry.status === 'approved') {
                    statusClass = 'bg-primary-light text-primary'
                  } else {
                    statusClass = 'bg-violet-100 text-violet-800'
                  }
                }

                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {student.firstName} {student.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}`}
                      >
                        {statusText}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                        {student.cardId.slice(0, 8)}...
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {isOut ? (
                        <button
                          onClick={() => handleManualCheckInOut(student)}
                          disabled={isProcessing}
                          className="font-medium mr-3 text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
                        >
                          {isProcessing ? '...' : 'Check In'}
                        </button>
                      ) : waitlistEntry ? (
                        <>
                          <button
                            onClick={() => handleCancelWaitlist(student.id, waitlistEntry.id)}
                            disabled={isProcessing}
                            className="font-medium mr-3 text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            {isProcessing ? '...' : 'Cancel'}
                          </button>
                          {waitlistEntry.status === 'approved' && (
                            <button
                              onClick={() => handleManualCheckInOut(student)}
                              disabled={isProcessing}
                              className="font-medium mr-3 text-amber-600 hover:text-amber-800 disabled:opacity-50"
                            >
                              Check Out
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => handleManualCheckInOut(student)}
                          disabled={isProcessing}
                          className="font-medium mr-3 text-amber-600 hover:text-amber-800 disabled:opacity-50"
                        >
                          {isProcessing ? '...' : 'Check Out'}
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(student)}
                        className="text-primary hover:text-primary-hover font-medium mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(student.id)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <StudentModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={editingStudent ? handleUpdateStudent : handleAddStudent}
        student={editingStudent}
      />

      <CSVUploadModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        onUpload={handleBulkUpload}
      />

      <QRCardsModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        students={students}
        classroomName={classroomName}
      />

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Remove Student</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to remove this student from the classroom? They can be re-added later.
            </p>
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteStudent(deleteConfirm)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {checkoutStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Check Out Student</h3>
            <p className="mt-2 text-sm text-gray-600">
              Where is {checkoutStudent.firstName} {checkoutStudent.lastName} going?
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {destinations.map(dest => {
                const isAtCapacity = dest.capacity &&
                  ((dest.currentCount || 0) + (dest.approvedCount || 0)) >= dest.capacity

                return (
                  <div key={dest.id} className="border rounded-md overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{dest.name}</span>
                        {dest.capacity && (
                          <span className={`ml-2 text-xs ${isAtCapacity ? 'text-amber-600' : 'text-gray-500'}`}>
                            ({dest.currentCount || 0}/{dest.capacity} out)
                          </span>
                        )}
                      </div>
                      {isAtCapacity && (
                        <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded">
                          Full
                        </span>
                      )}
                    </div>
                    <div className="px-4 py-2 flex gap-2">
                      {isAtCapacity ? (
                        <>
                          <button
                            onClick={() => performCheckInOut(checkoutStudent.id, 'out', dest.name, false)}
                            className="flex-1 px-3 py-2 text-sm font-medium text-violet-700 bg-violet-100 hover:bg-violet-200 rounded-md"
                          >
                            Add to Wait List
                          </button>
                          <button
                            onClick={() => performCheckInOut(checkoutStudent.id, 'out', dest.name, true)}
                            className="flex-1 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-md"
                          >
                            Override Limit
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => performCheckInOut(checkoutStudent.id, 'out', dest.name)}
                          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                        >
                          Check Out
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setCheckoutStudent(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
