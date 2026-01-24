'use client'

import { useState, useEffect, useCallback } from 'react'
import GoogleIcon from './icons/GoogleIcon'
import type { CourseWithStudentCount, ImportResult } from '@/types/google-classroom'

type Step = 'connect' | 'select' | 'importing' | 'results'

interface Props {
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void
  initialConnected?: boolean
}

export default function GoogleClassroomImportModal({
  isOpen,
  onClose,
  onImportComplete,
  initialConnected = false,
}: Props) {
  const [step, setStep] = useState<Step>(initialConnected ? 'select' : 'connect')
  const [isConnected, setIsConnected] = useState(initialConnected)
  const [courses, setCourses] = useState<CourseWithStudentCount[]>([])
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<{
    results: ImportResult[]
    summary: { coursesImported: number; totalCourses: number; totalStudents: number }
  } | null>(null)

  const checkConnectionStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/google/status')
      const data = await response.json()
      setIsConnected(data.connected)
      if (data.connected) {
        setStep('select')
      }
    } catch {
      setIsConnected(false)
    }
  }, [])

  // Check connection status on mount
  useEffect(() => {
    if (isOpen && !initialConnected) {
      checkConnectionStatus()
    }
  }, [isOpen, initialConnected, checkConnectionStatus])

  // Load courses when connected
  useEffect(() => {
    if (isOpen && isConnected && step === 'select' && courses.length === 0) {
      loadCourses()
    }
  }, [isOpen, isConnected, step, courses.length])

  async function loadCourses() {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/google/courses')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load courses')
      }

      setCourses(data.courses)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses')
    } finally {
      setIsLoading(false)
    }
  }

  function handleConnect() {
    // Redirect to Google OAuth
    window.location.href = '/api/google/auth'
  }

  function handleCourseToggle(courseId: string) {
    setSelectedCourses((prev) => {
      const next = new Set(prev)
      if (next.has(courseId)) {
        next.delete(courseId)
      } else {
        next.add(courseId)
      }
      return next
    })
  }

  function handleSelectAll() {
    if (selectedCourses.size === courses.length) {
      setSelectedCourses(new Set())
    } else {
      setSelectedCourses(new Set(courses.map((c) => c.id)))
    }
  }

  async function handleImport() {
    if (selectedCourses.size === 0) return

    setStep('importing')
    setError('')

    try {
      const response = await fetch('/api/google/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseIds: Array.from(selectedCourses) }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Import failed')
      }

      setResults(data)
      setStep('results')
      onImportComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
      setStep('select')
    }
  }

  function handleClose() {
    // Reset state on close
    setStep(isConnected ? 'select' : 'connect')
    setSelectedCourses(new Set())
    setResults(null)
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        <div className="relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all w-full max-w-lg">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GoogleIcon className="w-6 h-6" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Import from Google Classroom
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {step === 'connect' && (
              <ConnectStep onConnect={handleConnect} />
            )}

            {step === 'select' && (
              <SelectStep
                courses={courses}
                selectedCourses={selectedCourses}
                isLoading={isLoading}
                onToggle={handleCourseToggle}
                onSelectAll={handleSelectAll}
              />
            )}

            {step === 'importing' && <ImportingStep />}

            {step === 'results' && results && (
              <ResultsStep results={results} />
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
            {step === 'select' && (
              <>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={selectedCourses.size === 0 || isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Import {selectedCourses.size > 0 && `(${selectedCourses.size})`}
                </button>
              </>
            )}

            {step === 'results' && (
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ConnectStep({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="text-center py-6">
      <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <GoogleIcon className="w-8 h-8" />
      </div>
      <h4 className="text-lg font-medium text-gray-900 mb-2">
        Connect Your Google Account
      </h4>
      <p className="text-sm text-gray-600 mb-6">
        Connect your Google account to import classes and students from Google Classroom.
      </p>
      <button
        onClick={onConnect}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
      >
        <GoogleIcon className="w-5 h-5" />
        Connect with Google
      </button>
    </div>
  )
}

function SelectStep({
  courses,
  selectedCourses,
  isLoading,
  onToggle,
  onSelectAll,
}: {
  courses: CourseWithStudentCount[]
  selectedCourses: Set<string>
  isLoading: boolean
  onToggle: (id: string) => void
  onSelectAll: () => void
}) {
  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-sm text-gray-600">Loading your courses...</p>
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h4 className="text-lg font-medium text-gray-900 mb-2">
          No Active Courses Found
        </h4>
        <p className="text-sm text-gray-600">
          You don&apos;t have any active courses in Google Classroom where you&apos;re a teacher.
        </p>
      </div>
    )
  }

  const allSelected = selectedCourses.size === courses.length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          Select which courses to import:
        </p>
        <button
          onClick={onSelectAll}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-200">
        {courses.map((course) => (
          <label
            key={course.id}
            className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedCourses.has(course.id)}
              onChange={() => onToggle(course.id)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {course.name}
                {course.section && (
                  <span className="text-gray-500"> - {course.section}</span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                {course.studentCount} student{course.studentCount !== 1 ? 's' : ''}
              </p>
            </div>
          </label>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Each course will be imported as a new classroom with all its students.
      </p>
    </div>
  )
}

function ImportingStep() {
  return (
    <div className="py-12 text-center">
      <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-sm text-gray-600">
        Importing your courses and students...
      </p>
      <p className="mt-2 text-xs text-gray-500">
        This may take a moment.
      </p>
    </div>
  )
}

function ResultsStep({
  results,
}: {
  results: {
    results: ImportResult[]
    summary: { coursesImported: number; totalCourses: number; totalStudents: number }
  }
}) {
  const { summary } = results
  const hasErrors = results.results.some((r) => !r.success)

  return (
    <div>
      <div className="text-center mb-6">
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
          hasErrors ? 'bg-yellow-100' : 'bg-green-100'
        }`}>
          {hasErrors ? (
            <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <h4 className="text-lg font-medium text-gray-900 mb-2">
          Import {hasErrors ? 'Completed with Errors' : 'Complete'}
        </h4>
        <p className="text-sm text-gray-600">
          {summary.coursesImported} of {summary.totalCourses} course{summary.totalCourses !== 1 ? 's' : ''} imported
          {' '}with {summary.totalStudents} total student{summary.totalStudents !== 1 ? 's' : ''}.
        </p>
      </div>

      {hasErrors && (
        <div className="border border-gray-200 rounded-md divide-y divide-gray-200 max-h-48 overflow-y-auto">
          {results.results.map((result, i) => (
            <div key={i} className="p-3 flex items-center gap-3">
              {result.success ? (
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {result.courseName}
                </p>
                {result.success ? (
                  <p className="text-xs text-gray-500">
                    {result.studentsImported} student{result.studentsImported !== 1 ? 's' : ''} imported
                  </p>
                ) : (
                  <p className="text-xs text-red-600">{result.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
