'use client'

import { useState } from 'react'
import Link from 'next/link'

type Classroom = {
  id: string
  name: string
  isActive: boolean
  createdAt: string
  _count: {
    students: number
  }
}

type Props = {
  classroom: Classroom
  onEdit: (classroom: Classroom) => void
  onDelete: (id: string) => void
}

export default function ClassroomCard({ classroom, onEdit, onDelete }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {classroom.name}
              </h3>
              {!classroom.isActive && (
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                  Inactive
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {classroom._count.students} {classroom._count.students === 1 ? 'student' : 'students'}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Link
            href={`/dashboard/classroom/${classroom.id}`}
            className="flex-1 text-center px-3 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-md"
          >
            Manage
          </Link>
          <Link
            href={`/classroom/${classroom.id}/kiosk-launch`}
            className="px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md"
          >
            Launch Kiosk
          </Link>
          <button
            onClick={() => onEdit(classroom)}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Edit
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md"
          >
            Delete
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete Classroom</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete &quot;{classroom.name}&quot;? This will also remove all student enrollments and check-in records for this classroom. This action cannot be undone.
            </p>
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(classroom.id)
                  setShowDeleteConfirm(false)
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
