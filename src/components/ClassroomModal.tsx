'use client'

import { useState, useEffect } from 'react'

type Classroom = {
  id: string
  name: string
  isActive: boolean
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { name: string; isActive?: boolean }) => Promise<void>
  classroom?: Classroom | null
}

export default function ClassroomModal({ isOpen, onClose, onSave, classroom }: Props) {
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const isEditing = !!classroom

  useEffect(() => {
    if (classroom) {
      setName(classroom.name)
      setIsActive(classroom.isActive)
    } else {
      setName('')
      setIsActive(true)
    }
    setError('')
  }, [classroom, isOpen])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Classroom name is required')
      return
    }

    setIsLoading(true)

    try {
      await onSave({
        name: name.trim(),
        ...(isEditing && { isActive })
      })
      onClose()
    } catch {
      setError('Failed to save classroom. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h2 className="text-xl font-semibold text-gray-900">
          {isEditing ? 'Edit Classroom' : 'Create Classroom'}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Classroom Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Period 1 - English"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              autoFocus
            />
          </div>

          {isEditing && (
            <div className="mt-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Inactive classrooms won&apos;t appear in the check-in interface
              </p>
            </div>
          )}

          <div className="mt-6 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Classroom'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
