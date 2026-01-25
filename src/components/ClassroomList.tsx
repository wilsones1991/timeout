'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import ClassroomCard from './ClassroomCard'
import ClassroomModal from './ClassroomModal'
import GoogleClassroomImportModal from './GoogleClassroomImportModal'
import GoogleIcon from './icons/GoogleIcon'

type Classroom = {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  _count: {
    students: number
  }
}

export default function ClassroomList() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [googleJustConnected, setGoogleJustConnected] = useState(false)

  const searchParams = useSearchParams()

  // Check for Google OAuth callback
  useEffect(() => {
    const googleParam = searchParams.get('google')
    if (googleParam === 'connected') {
      setGoogleJustConnected(true)
      setIsImportModalOpen(true)
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard')
    } else if (googleParam === 'error') {
      const errorMessage = searchParams.get('error_message') || 'Failed to connect Google account'
      setError(errorMessage)
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [searchParams])

  const fetchClassrooms = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/classrooms')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch classrooms')
      }

      setClassrooms(data.classrooms)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load classrooms')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClassrooms()
  }, [fetchClassrooms])

  async function handleCreate(data: { name: string }) {
    const response = await fetch('/api/admin/classrooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.error || 'Failed to create classroom')
    }

    await fetchClassrooms()
  }

  async function handleUpdate(data: { name: string; isActive?: boolean }) {
    if (!editingClassroom) return

    const response = await fetch(`/api/admin/classrooms/${editingClassroom.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.error || 'Failed to update classroom')
    }

    await fetchClassrooms()
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`/api/admin/classrooms/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete classroom')
      }

      setClassrooms(classrooms.filter(c => c.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete classroom')
    }
  }

  function openCreateModal() {
    setEditingClassroom(null)
    setIsModalOpen(true)
  }

  function openEditModal(classroom: Classroom) {
    setEditingClassroom(classroom)
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingClassroom(null)
  }

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Your Classrooms
        </h2>
        <div className="flex gap-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 font-medium rounded-md border border-gray-300 hover:bg-gray-50"
          >
            <GoogleIcon className="w-5 h-5" />
            Import from Google Classroom
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-hover"
          >
            Create Classroom
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
          <button
            onClick={() => setError('')}
            className="ml-2 text-red-800 font-medium hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {classrooms.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No classrooms yet</h3>
          <p className="text-gray-500 mb-4">
            Create your first classroom to start tracking student check-ins.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-hover"
          >
            Create Classroom
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classrooms.map(classroom => (
            <ClassroomCard
              key={classroom.id}
              classroom={classroom}
              onEdit={openEditModal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <ClassroomModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={editingClassroom ? handleUpdate : handleCreate}
        classroom={editingClassroom}
      />

      <GoogleClassroomImportModal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false)
          setGoogleJustConnected(false)
        }}
        onImportComplete={fetchClassrooms}
        initialConnected={googleJustConnected}
      />
    </div>
  )
}
