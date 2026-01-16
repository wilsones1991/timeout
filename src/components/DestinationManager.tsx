'use client'

import { useState, useEffect } from 'react'

type Destination = {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
}

type Props = {
  classroomId: string
}

export default function DestinationManager({ classroomId }: Props) {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [newName, setNewName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDestinations() {
      try {
        const response = await fetch(`/api/classrooms/${classroomId}/destinations`)
        if (response.ok) {
          const data = await response.json()
          setDestinations(data.destinations)
        }
      } catch {
        setError('Failed to load destinations')
      } finally {
        setIsLoading(false)
      }
    }
    loadDestinations()
  }, [classroomId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || isAdding) return

    setIsAdding(true)
    setError(null)

    try {
      const response = await fetch(`/api/classrooms/${classroomId}/destinations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add destination')
      }

      const data = await response.json()
      setDestinations([...destinations, data.destination])
      setNewName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add destination')
    } finally {
      setIsAdding(false)
    }
  }

  async function handleDelete(destId: string) {
    setError(null)

    try {
      const response = await fetch(`/api/classrooms/${classroomId}/destinations/${destId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete destination')
      }

      setDestinations(destinations.filter(d => d.id !== destId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete destination')
    }
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
        Check-out Destinations
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Students will select one of these destinations when checking out.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Destination list */}
      <ul className="space-y-2 mb-4">
        {destinations.map(dest => (
          <li
            key={dest.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <span className="font-medium text-gray-900">{dest.name}</span>
            <button
              onClick={() => handleDelete(dest.id)}
              className="p-1 text-gray-400 hover:text-red-500"
              title="Delete destination"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </li>
        ))}
        {destinations.length === 0 && (
          <li className="p-3 text-center text-gray-500 bg-gray-50 rounded-lg">
            No destinations configured. Add one below.
          </li>
        )}
      </ul>

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New destination name"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={!newName.trim() || isAdding}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAdding ? 'Adding...' : 'Add'}
        </button>
      </form>
    </div>
  )
}
