'use client'

import { useState, useEffect, useCallback } from 'react'
import GoogleIcon from './icons/GoogleIcon'

interface SyncStatus {
  hasGoogleAccount: boolean
  studentsWithoutHash: number
  totalStudents: number
}

interface SyncMatch {
  studentId: string
  studentName: string
  googleUserId: string
}

interface SyncConflict {
  googleName: string
  matchingStudents: { id: string; name: string }[]
}

interface SyncResult {
  matched: SyncMatch[]
  unmatched: string[]
  conflicts: SyncConflict[]
  updated: number
}

export default function GoogleSyncBanner() {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)
  const [previewResult, setPreviewResult] = useState<SyncResult | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncComplete, setSyncComplete] = useState(false)
  const [error, setError] = useState('')

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/google/sync-students')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch {
      // Silently fail - banner just won't show
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  async function handlePreview() {
    setIsSyncing(true)
    setError('')

    try {
      const response = await fetch('/api/google/sync-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to preview sync')
      }

      const result = await response.json()
      setPreviewResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview sync')
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleSync() {
    setIsSyncing(true)
    setError('')

    try {
      const response = await fetch('/api/google/sync-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to sync students')
      }

      const result = await response.json()
      setPreviewResult(result)
      setSyncComplete(true)
      // Refresh status after sync
      await fetchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync students')
    } finally {
      setIsSyncing(false)
    }
  }

  // Don't show if loading, dismissed, no Google account, or no students to sync
  if (isLoading || isDismissed) {
    return null
  }

  if (!status?.hasGoogleAccount || status.studentsWithoutHash === 0) {
    return null
  }

  // After successful sync
  if (syncComplete) {
    return (
      <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-green-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">
              Sync complete! {previewResult?.updated || 0} student{(previewResult?.updated || 0) !== 1 ? 's' : ''} linked to Google accounts.
            </p>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="flex-shrink-0 text-green-600 hover:text-green-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  // Preview results view
  if (previewResult) {
    return (
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-blue-600">
            <GoogleIcon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Sync Preview
            </h3>

            <div className="text-sm text-blue-700 space-y-1 mb-3">
              <p>
                <span className="font-medium">{previewResult.matched.length}</span> student{previewResult.matched.length !== 1 ? 's' : ''} will be linked
              </p>
              {previewResult.unmatched.length > 0 && (
                <p className="text-blue-600">
                  {previewResult.unmatched.length} Google student{previewResult.unmatched.length !== 1 ? 's' : ''} not found locally
                </p>
              )}
              {previewResult.conflicts.length > 0 && (
                <p className="text-amber-600">
                  {previewResult.conflicts.length} conflict{previewResult.conflicts.length !== 1 ? 's' : ''} (multiple students with same name)
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600 mb-3">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSync}
                disabled={isSyncing || previewResult.matched.length === 0}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSyncing ? 'Syncing...' : 'Confirm Sync'}
              </button>
              <button
                onClick={() => {
                  setPreviewResult(null)
                  setError('')
                }}
                disabled={isSyncing}
                className="px-3 py-1.5 bg-white text-blue-700 text-sm font-medium rounded border border-blue-300 hover:bg-blue-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="flex-shrink-0 text-blue-600 hover:text-blue-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  // Initial banner
  return (
    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-blue-600">
          <GoogleIcon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-800">
            Link existing students to Google Classroom
          </p>
          <p className="text-sm text-blue-600 mt-1">
            {status.studentsWithoutHash} of {status.totalStudents} student{status.totalStudents !== 1 ? 's' : ''} can be linked to enable QR code sharing across teachers.
          </p>

          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}

          <button
            onClick={handlePreview}
            disabled={isSyncing}
            className="mt-3 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSyncing ? 'Loading...' : 'Preview Sync'}
          </button>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="flex-shrink-0 text-blue-600 hover:text-blue-800"
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
