import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/encryption'
import type {
  GoogleCourse,
  GoogleStudent,
  GoogleCoursesResponse,
  GoogleStudentsResponse,
} from '@/types/google-classroom'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CLASSROOM_API_BASE = 'https://classroom.googleapis.com/v1'

/**
 * Get a valid access token for a user, refreshing if expired.
 * Returns null if the user has no connected Google account.
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const googleAccount = await prisma.googleAccount.findUnique({
    where: { userId },
  })

  if (!googleAccount) {
    return null
  }

  // Decrypt the stored access token
  const accessToken = decrypt(googleAccount.accessToken)

  // Check if token is expired (with 5 minute buffer)
  const isExpired = googleAccount.expiresAt
    ? googleAccount.expiresAt.getTime() < Date.now() + 5 * 60 * 1000
    : false

  if (!isExpired) {
    return accessToken
  }

  // Token is expired, try to refresh
  if (!googleAccount.refreshToken) {
    // No refresh token, user needs to re-authenticate
    return null
  }

  const refreshToken = decrypt(googleAccount.refreshToken)
  const newTokens = await refreshGoogleToken(refreshToken)

  if (!newTokens) {
    // Refresh failed, user needs to re-authenticate
    return null
  }

  // Update stored tokens
  await prisma.googleAccount.update({
    where: { userId },
    data: {
      accessToken: encrypt(newTokens.access_token),
      expiresAt: newTokens.expires_in
        ? new Date(Date.now() + newTokens.expires_in * 1000)
        : null,
      // Only update refresh token if a new one was provided
      ...(newTokens.refresh_token && {
        refreshToken: encrypt(newTokens.refresh_token),
      }),
    },
  })

  return newTokens.access_token
}

interface TokenResponse {
  access_token: string
  expires_in?: number
  refresh_token?: string
  token_type: string
  scope: string
}

/**
 * Refresh a Google access token using the refresh token.
 */
async function refreshGoogleToken(
  refreshToken: string
): Promise<TokenResponse | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('Google OAuth credentials not configured')
    return null
  }

  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      console.error('Token refresh failed:', await response.text())
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Token refresh error:', error)
    return null
  }
}

/**
 * Fetch all courses where the user is a teacher.
 */
export async function fetchAllCourses(
  accessToken: string
): Promise<GoogleCourse[]> {
  const courses: GoogleCourse[] = []
  let pageToken: string | undefined

  do {
    const url = new URL(`${CLASSROOM_API_BASE}/courses`)
    url.searchParams.set('teacherId', 'me')
    url.searchParams.set('courseStates', 'ACTIVE')
    url.searchParams.set('pageSize', '100')
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken)
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to fetch courses: ${error}`)
    }

    const data: GoogleCoursesResponse = await response.json()
    if (data.courses) {
      courses.push(...data.courses)
    }
    pageToken = data.nextPageToken
  } while (pageToken)

  return courses
}

/**
 * Fetch all students in a specific course.
 */
export async function fetchCourseStudents(
  accessToken: string,
  courseId: string
): Promise<GoogleStudent[]> {
  const students: GoogleStudent[] = []
  let pageToken: string | undefined

  do {
    const url = new URL(`${CLASSROOM_API_BASE}/courses/${courseId}/students`)
    url.searchParams.set('pageSize', '100')
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken)
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to fetch students: ${error}`)
    }

    const data: GoogleStudentsResponse = await response.json()
    if (data.students) {
      students.push(...data.students)
    }
    pageToken = data.nextPageToken
  } while (pageToken)

  return students
}

/**
 * Count students in a course (faster than fetching all details).
 */
export async function countCourseStudents(
  accessToken: string,
  courseId: string
): Promise<number> {
  // Google Classroom API doesn't have a count endpoint,
  // so we fetch with minimal fields and count
  let count = 0
  let pageToken: string | undefined

  do {
    const url = new URL(`${CLASSROOM_API_BASE}/courses/${courseId}/students`)
    url.searchParams.set('pageSize', '100')
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken)
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      // Return 0 if we can't access the course students
      return 0
    }

    const data: GoogleStudentsResponse = await response.json()
    count += data.students?.length ?? 0
    pageToken = data.nextPageToken
  } while (pageToken)

  return count
}
