'use client'

import { useState, useEffect, useCallback } from 'react'

export type WaitListEntry = {
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

export type WaitlistData = {
  entries: WaitListEntry[]
  byDestination: Record<string, WaitListEntry[]>
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

type UseWaitlistOptions = {
  pollInterval?: number // in milliseconds, default 10000
}

/**
 * Hook for fetching and polling waitlist data for a classroom
 */
export function useWaitlist(
  classroomId: string,
  options: UseWaitlistOptions = {}
): WaitlistData {
  const { pollInterval = 10000 } = options

  const [entries, setEntries] = useState<WaitListEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWaitlist = useCallback(async () => {
    try {
      const response = await fetch(`/api/classroom/${classroomId}/waitlist`)
      if (response.ok) {
        const data = await response.json()
        setEntries(data.entries || [])
        setError(null)
      } else {
        throw new Error('Failed to fetch waitlist')
      }
    } catch {
      setError('Failed to load wait list')
    } finally {
      setIsLoading(false)
    }
  }, [classroomId])

  useEffect(() => {
    fetchWaitlist()

    const interval = setInterval(fetchWaitlist, pollInterval)
    return () => clearInterval(interval)
  }, [fetchWaitlist, pollInterval])

  // Group entries by destination
  const byDestination = entries.reduce((acc, entry) => {
    if (!acc[entry.destinationName]) {
      acc[entry.destinationName] = []
    }
    acc[entry.destinationName].push(entry)
    return acc
  }, {} as Record<string, WaitListEntry[]>)

  return {
    entries,
    byDestination,
    isLoading,
    error,
    refresh: fetchWaitlist
  }
}

/**
 * Helper to calculate wait duration string from a createdAt timestamp
 */
export function getWaitDuration(createdAt: string): string {
  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes === 1) return '1 min'
  return `${minutes} min`
}
