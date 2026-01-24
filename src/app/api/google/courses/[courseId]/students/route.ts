import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getValidAccessToken, fetchCourseStudents } from '@/lib/google-classroom'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { courseId } = await params

  const accessToken = await getValidAccessToken(session.user.id)

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Google account not connected or token expired' },
      { status: 401 }
    )
  }

  try {
    const students = await fetchCourseStudents(accessToken, courseId)

    // Return simplified student data for preview
    const studentList = students.map((student) => ({
      id: student.userId,
      firstName: student.profile.name.givenName,
      lastName: student.profile.name.familyName,
    }))

    return NextResponse.json({ students: studentList })
  } catch (err) {
    console.error('Error fetching students:', err)
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    )
  }
}
