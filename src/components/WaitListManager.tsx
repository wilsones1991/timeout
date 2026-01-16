'use client'

import { useState, useEffect } from 'react'

type WaitListEntry = {
  id: string
  studentId: string
  studentName: string
  destinationId: string
  destinationName: string
  position: number
  status: 'waiting' | 'approved'
  createdAt: string
  approvedAt: string | null
}

type Props = {
  classroomId: string
}

export default function WaitListManager({ classroomId }: Props) {
  const [entries, setEntries] = useState<WaitListEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  async function loadWaitlist() {
    try {
      const response = await fetch(`/api/classroom/${classroomId}/waitlist`)
      if (response.ok) {
        const data = await response.json()
        setEntries(data.entries || [])
      }
    } catch {
      setError('Failed to load wait list')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadWaitlist()

    // Poll every 10 seconds
    const interval = setInterval(loadWaitlist, 10000)
    return () => clearInterval(interval)
  }, [classroomId])

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
      await loadWaitlist()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform action')
    } finally {
      setActionInProgress(null)
    }
  }

  // Group entries by destination
  const byDestination = entries.reduce((acc, entry) => {
    if (!acc[entry.destinationName]) {
      acc[entry.destinationName] = []
    }
    acc[entry.destinationName].push(entry)
    return acc
  }, {} as Record<string, WaitListEntry[]>)

  function getWaitDuration(createdAt: string): string {
    const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes === 1) return '1 min'
    return `${minutes} min`
  }

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
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Wait List
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
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
