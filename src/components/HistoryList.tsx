'use client'

import { useState, useEffect, useCallback } from 'react'

type HistoryRecord = {
  id: string
  studentId: string
  studentName: string
  checkOutAt: string
  checkInAt: string | null
  destination: string | null
  durationMinutes: number | null
  manualOverride: boolean
  isActive: boolean
}

type Props = {
  classroomId: string
}

export default function HistoryList({ classroomId }: Props) {
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)

  const fetchHistory = useCallback(async (reset = false) => {
    try {
      const currentOffset = reset ? 0 : offset
      const params = new URLSearchParams({
        limit: '50',
        offset: currentOffset.toString()
      })

      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const response = await fetch(
        `/api/admin/classroom/${classroomId}/history?${params}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch history')
      }

      if (reset) {
        setHistory(data.history)
        setOffset(50)
      } else {
        setHistory(prev => [...prev, ...data.history])
        setOffset(prev => prev + 50)
      }

      setHasMore(data.pagination.hasMore)
      setTotal(data.pagination.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      setIsLoading(false)
    }
  }, [classroomId, dateFrom, dateTo, offset])

  useEffect(() => {
    fetchHistory(true)
  }, [classroomId, dateFrom, dateTo]) // eslint-disable-line react-hooks/exhaustive-deps

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  function formatDuration(minutes: number | null) {
    if (minutes === null) return '—'
    if (minutes < 1) return '<1 min'
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  function handleFilter() {
    setIsLoading(true)
    setOffset(0)
    fetchHistory(true)
  }

  function handleClearFilter() {
    setDateFrom('')
    setDateTo('')
    setIsLoading(true)
    setOffset(0)
  }

  if (isLoading && history.length === 0) {
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
      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary"
            />
          </div>
          <button
            onClick={handleFilter}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-md"
          >
            Filter
          </button>
          {(dateFrom || dateTo) && (
            <button
              onClick={handleClearFilter}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Clear
            </button>
          )}
          <div className="flex-1 text-right text-sm text-gray-500">
            {total} records
          </div>
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

      {history.length === 0 ? (
        <div className="text-center py-12 px-6">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No history yet</h3>
          <p className="text-gray-500">
            Check-in and check-out records will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destination
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map(record => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {record.studentName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(record.checkOutAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.destination || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(record.checkOutAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.checkInAt ? (
                        formatTime(record.checkInAt)
                      ) : (
                        <span className="text-amber-600 font-medium">Still out</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.isActive ? (
                        <span className="text-amber-600">—</span>
                      ) : (
                        <span className={record.durationMinutes && record.durationMinutes > 15 ? 'text-red-600 font-medium' : ''}>
                          {formatDuration(record.durationMinutes)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {record.manualOverride ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          Manual
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-light text-primary">
                          Scan
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="px-6 py-4 border-t border-gray-200 text-center">
              <button
                onClick={() => fetchHistory(false)}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-primary hover:text-primary-hover disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
