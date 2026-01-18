'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

type User = {
  id: string
  email: string
  name: string | null
}

type Classroom = {
  id: string
  name: string
}

type SessionState = {
  isLoading: boolean
  isAuthenticated: boolean
  user: User | null
  classrooms: Classroom[]
  error: string | null
}

type LoginResult = {
  success: boolean
  error?: string
}

// Session check interval (5 minutes)
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000

export function useKioskSession() {
  const [state, setState] = useState<SessionState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    classrooms: [],
    error: null,
  })

  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  // Check session status
  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/kiosk/session')
      const data = await response.json()

      if (!isMountedRef.current) return

      if (data.authenticated) {
        setState({
          isLoading: false,
          isAuthenticated: true,
          user: data.user,
          classrooms: data.classrooms || [],
          error: null,
        })
      } else {
        setState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          classrooms: [],
          error: null,
        })
      }
    } catch {
      if (!isMountedRef.current) return
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to check session',
      }))
    }
  }, [])

  // Login function
  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      setState((prev) => ({ ...prev, error: null }))

      try {
        const response = await fetch('/api/kiosk/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })

        const data = await response.json()

        if (!response.ok) {
          setState((prev) => ({ ...prev, error: data.error }))
          return { success: false, error: data.error }
        }

        // Refresh session after successful login
        await checkSession()
        return { success: true }
      } catch {
        const errorMessage = 'An error occurred during login'
        setState((prev) => ({ ...prev, error: errorMessage }))
        return { success: false, error: errorMessage }
      }
    },
    [checkSession]
  )

  // Initial session check on mount
  useEffect(() => {
    isMountedRef.current = true

    // Async function to check session
    const doCheck = async () => {
      await checkSession()
    }
    doCheck()

    return () => {
      isMountedRef.current = false
    }
  }, [checkSession])

  // Periodic session check
  useEffect(() => {
    if (!state.isAuthenticated) {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
        checkIntervalRef.current = null
      }
      return
    }

    checkIntervalRef.current = setInterval(() => {
      checkSession()
    }, SESSION_CHECK_INTERVAL)

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
        checkIntervalRef.current = null
      }
    }
  }, [state.isAuthenticated, checkSession])

  return {
    ...state,
    login,
    checkSession,
  }
}
