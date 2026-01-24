import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getValidAccessToken,
  fetchAllCourses,
  countCourseStudents,
} from '@/lib/google-classroom'
import type { CourseWithStudentCount } from '@/types/google-classroom'

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessToken = await getValidAccessToken(session.user.id)

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Google account not connected or token expired' },
      { status: 401 }
    )
  }

  try {
    const courses = await fetchAllCourses(accessToken)

    // Fetch student counts in parallel
    const coursesWithCounts: CourseWithStudentCount[] = await Promise.all(
      courses.map(async (course) => {
        const studentCount = await countCourseStudents(accessToken, course.id)
        return {
          ...course,
          studentCount,
        }
      })
    )

    return NextResponse.json({ courses: coursesWithCounts })
  } catch (err) {
    console.error('Error fetching courses:', err)
    return NextResponse.json(
      { error: 'Failed to fetch Google Classroom courses' },
      { status: 500 }
    )
  }
}
