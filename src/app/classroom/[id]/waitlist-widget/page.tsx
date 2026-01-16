'use client'

import { useState, useEffect, use } from 'react'
import { useWaitlist } from '@/hooks/useWaitlist'

type Props = {
  params: Promise<{ id: string }>
}

export default function WaitListWidgetPage({ params }: Props) {
  const { id: classroomId } = use(params)
  const { entries, byDestination, isLoading } = useWaitlist(classroomId, { pollInterval: 4000 })
  const [classroom, setClassroom] = useState<{ name: string } | null>(null)

  // Fetch classroom name separately (the hook doesn't return it)
  useEffect(() => {
    async function fetchClassroom() {
      try {
        const response = await fetch(`/api/classroom/${classroomId}/waitlist`)
        if (response.ok) {
          const data = await response.json()
          setClassroom(data.classroom)
        }
      } catch {
        // Ignore errors
      }
    }
    fetchClassroom()
  }, [classroomId])

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

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          {classroom?.name || 'Wait List'}
        </h1>
        <p className="text-xl text-gray-400">Wait List</p>
      </header>

      {entries.length === 0 ? (
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
          <div className="text-center">
            <svg className="w-24 h-24 mx-auto mb-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-3xl text-gray-500">No students waiting</p>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-8">
          {Object.entries(byDestination).map(([destination, destEntries]) => (
            <div key={destination}>
              <h2 className="text-2xl font-semibold text-blue-400 mb-4 flex items-center gap-3">
                <span>{destination}</span>
                <span className="text-lg text-gray-500">({destEntries.length})</span>
              </h2>

              <div className="space-y-3">
                {destEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-5 rounded-xl flex items-center gap-4 ${
                      entry.status === 'approved'
                        ? 'bg-green-600 animate-pulse'
                        : 'bg-gray-800'
                    }`}
                  >
                    <span className={`w-12 h-12 flex items-center justify-center rounded-full text-xl font-bold ${
                      entry.status === 'approved'
                        ? 'bg-white text-green-600'
                        : 'bg-gray-700 text-white'
                    }`}>
                      {entry.position}
                    </span>

                    <div className="flex-1">
                      <div className="text-2xl font-medium text-white">
                        {entry.studentName}
                      </div>
                      {entry.status === 'approved' && (
                        <div className="text-lg text-green-200 font-medium">
                          APPROVED - Ready to go!
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 p-4 text-center text-gray-600 text-sm">
        Auto-refreshing every 4 seconds
      </footer>
    </div>
  )
}
