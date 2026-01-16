'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWaitlist, getWaitDuration } from '@/hooks/useWaitlist'

type Student = {
  id: string
  firstName: string
  lastName: string
}

type Destination = {
  id: string
  name: string
  capacity: number | null
  currentCount: number
}

type Props = {
  classroomId: string
}

export default function WaitListManager({ classroomId }: Props) {
  const { entries, byDestination, isLoading, error: waitlistError, refresh } = useWaitlist(classroomId)

  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  // Add student to waitlist state
  const [showAddForm, setShowAddForm] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [checkedOutStudentIds, setCheckedOutStudentIds] = useState<Set<string>>(new Set())
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedDestinationId, setSelectedDestinationId] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const loadStudentsAndDestinations = useCallback(async () => {
    try {
      // Fetch students
      const studentsRes = await fetch(`/api/admin/classrooms/${classroomId}/students`)
      if (studentsRes.ok) {
        const data = await studentsRes.json()
        setStudents(data.students || [])
      }

      // Fetch destinations and queue from kiosk endpoint
      const kioskRes = await fetch(`/api/classroom/${classroomId}/kiosk`)
      if (kioskRes.ok) {
        const data = await kioskRes.json()
        // Only include destinations with capacity limits
        setDestinations(
          (data.destinations || []).filter((d: Destination) => d.capacity !== null)
        )
        // Track which students are checked out
        const checkedOut = new Set<string>(
          (data.queue || []).map((q: { studentId: string }) => q.studentId)
        )
        setCheckedOutStudentIds(checkedOut)
      }
    } catch {
      // Ignore errors - we'll just show empty lists
    }
  }, [classroomId])

  useEffect(() => {
    loadStudentsAndDestinations()

    // Poll every 10 seconds
    const interval = setInterval(loadStudentsAndDestinations, 10000)
    return () => clearInterval(interval)
  }, [loadStudentsAndDestinations])

  // Combine errors
  const displayError = error || waitlistError

  async function handleAction(entryId: string, action: 'skip' | 'remove' | 'approve') {
    setActionInProgress(entryId)
    setError(null)

    try {
      const response = await fetch(`/api/classroom/${classroomId}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, entryId })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to perform action')
      }

      // Reload the list
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform action')
    } finally {
      setActionInProgress(null)
    }
  }

  async function handleAddStudent() {
    if (!selectedStudentId || !selectedDestinationId) {
      setError('Please select a student and destination')
      return
    }

    setIsAdding(true)
    setError(null)

    try {
      const response = await fetch(`/api/classroom/${classroomId}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          studentId: selectedStudentId,
          destinationId: selectedDestinationId
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add student to wait list')
      }

      // Reset form and reload
      setSelectedStudentId('')
      setSelectedDestinationId('')
      setShowAddForm(false)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add student')
    } finally {
      setIsAdding(false)
    }
  }

  // Get eligible students (not checked out and not already on waitlist for selected destination)
  const waitlistStudentIds = new Set(
    entries
      .filter(e => e.destinationId === selectedDestinationId)
      .map(e => e.studentId)
  )

  const eligibleStudents = students.filter(
    s => !checkedOutStudentIds.has(s.id) && !waitlistStudentIds.has(s.id)
  )

  // Check if there's anyone out for a capacity-limited destination
  const hasStudentOutForCapacityDestination = destinations.some(d => d.currentCount > 0)

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded mb-2"></div>
          <div className="h-10 bg-gray-200 rounded mb-2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Wait List
        </h3>
        {hasStudentOutForCapacityDestination && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add to Wait List
          </button>
        )}
      </div>

      {displayError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {displayError}
        </div>
      )}

      {showAddForm && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Add Student to Wait List</h4>
            <button
              onClick={() => {
                setShowAddForm(false)
                setSelectedStudentId('')
                setSelectedDestinationId('')
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destination
              </label>
              <select
                value={selectedDestinationId}
                onChange={(e) => {
                  setSelectedDestinationId(e.target.value)
                  setSelectedStudentId('') // Reset student when destination changes
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select destination...</option>
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.currentCount}/{d.capacity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Student
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                disabled={!selectedDestinationId}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select student...</option>
                {eligibleStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowAddForm(false)
                setSelectedStudentId('')
                setSelectedDestinationId('')
              }}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleAddStudent}
              disabled={isAdding || !selectedStudentId || !selectedDestinationId}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding ? 'Adding...' : 'Add to Wait List'}
            </button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-center text-gray-500 py-8">
          No students waiting
        </p>
      ) : (
        <div className="space-y-6">
          {Object.entries(byDestination).map(([destination, destEntries]) => (
            <div key={destination}>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <span>{destination}</span>
                <span className="text-gray-400">({destEntries.length})</span>
              </h4>

              <div className="space-y-2">
                {destEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-lg flex items-center justify-between ${
                      entry.status === 'approved'
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-sm font-medium">
                        {entry.position}
                      </span>
                      <div>
                        <div className="font-medium text-gray-900">
                          {entry.studentName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {entry.status === 'approved' ? (
                            <span className="text-green-600 font-medium">Approved</span>
                          ) : (
                            <span>Waiting {getWaitDuration(entry.createdAt)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {entry.status !== 'approved' && (
                        <button
                          onClick={() => handleAction(entry.id, 'approve')}
                          disabled={actionInProgress === entry.id}
                          className="px-2 py-1 text-sm text-green-600 hover:text-green-800 hover:bg-green-100 rounded disabled:opacity-50"
                          title="Approve now"
                        >
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => handleAction(entry.id, 'skip')}
                        disabled={actionInProgress === entry.id}
                        className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded disabled:opacity-50"
                        title="Move to end of queue"
                      >
                        Skip
                      </button>
                      <button
                        onClick={() => handleAction(entry.id, 'remove')}
                        disabled={actionInProgress === entry.id}
                        className="px-2 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-100 rounded disabled:opacity-50"
                        title="Remove from queue"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
