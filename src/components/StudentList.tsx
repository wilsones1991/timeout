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
  durationMinutes: number
}

type Props = {
  classroomId: string
  classroomName: string
}

export default function StudentList({ classroomId, classroomName }: Props) {
  const [students, setStudents] = useState<Student[]>([])
  const [checkedOutStudents, setCheckedOutStudents] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false)
  const [isQRModalOpen, setIsQRModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [processingCheckIn, setProcessingCheckIn] = useState<string | null>(null)

  const fetchStudents = useCallback(async () => {
    try {
      const response = await fetch(`/api/classrooms/${classroomId}/students`)
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
        const checkedOut = new Set<string>(
          (data.queue || []).map((item: QueueItem) => item.studentId)
        )
        setCheckedOutStudents(checkedOut)
      }
    } catch {
      // Ignore queue fetch errors
    }
  }, [classroomId])

  useEffect(() => {
    fetchStudents()
    fetchQueue()
  }, [fetchStudents, fetchQueue])

  // Poll for queue updates
  useEffect(() => {
    const interval = setInterval(fetchQueue, 10000)
    return () => clearInterval(interval)
  }, [fetchQueue])

  async function handleAddStudent(data: { firstName: string; lastName: string }) {
    const response = await fetch(`/api/classrooms/${classroomId}/students`, {
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
      `/api/classrooms/${classroomId}/students/${editingStudent.id}`,
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
        `/api/classrooms/${classroomId}/students/${studentId}`,
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
    const response = await fetch(`/api/classrooms/${classroomId}/students/bulk`, {
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

  async function handleManualCheckInOut(studentId: string) {
    const isOut = checkedOutStudents.has(studentId)
    const action = isOut ? 'in' : 'out'

    setProcessingCheckIn(studentId)
    setError('')

    try {
      const response = await fetch(`/api/classroom/${classroomId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          action,
          manualOverride: true
        })
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to update check-in status')
      }

      // Update local state
      setCheckedOutStudents(prev => {
        const next = new Set(prev)
        if (action === 'out') {
          next.add(studentId)
        } else {
          next.delete(studentId)
        }
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
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
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
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
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
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
                const isProcessing = processingCheckIn === student.id

                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {student.firstName} {student.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isOut
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {isOut ? 'Out' : 'In'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                        {student.cardId.slice(0, 8)}...
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => handleManualCheckInOut(student.id)}
                        disabled={isProcessing}
                        className={`font-medium mr-3 ${
                          isOut
                            ? 'text-green-600 hover:text-green-800'
                            : 'text-amber-600 hover:text-amber-800'
                        } disabled:opacity-50`}
                      >
                        {isProcessing ? '...' : isOut ? 'Check In' : 'Check Out'}
                      </button>
                      <button
                        onClick={() => openEditModal(student)}
                        className="text-blue-600 hover:text-blue-800 font-medium mr-3"
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
    </div>
  )
}
