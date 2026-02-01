import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'
import { hashGoogleUserId } from '@/lib/hash'
import {
  getValidAccessToken,
  fetchAllCourses,
  fetchCourseStudents,
} from '@/lib/google-classroom'
import type { GoogleStudent } from '@/types/google-classroom'

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
  unmatched: string[] // Google student names that didn't match
  conflicts: SyncConflict[]
  updated: number
}

/**
 * GET: Check sync status
 * Returns whether teacher has Google account connected and count of students without hash
 */
export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if teacher has Google account connected
  const googleAccount = await prisma.googleAccount.findUnique({
    where: { userId: session.user.id },
  })

  // Get all students for this teacher's classrooms
  const teacherClassrooms = await prisma.classroom.findMany({
    where: { teacherId: session.user.id },
    select: { id: true },
  })

  const classroomIds = teacherClassrooms.map((c) => c.id)

  // Count students in teacher's classrooms without googleUserIdHash
  const studentsWithoutHash = await prisma.student.count({
    where: {
      googleUserIdHash: null,
      classrooms: {
        some: {
          classroomId: { in: classroomIds },
        },
      },
    },
  })

  const totalStudents = await prisma.student.count({
    where: {
      classrooms: {
        some: {
          classroomId: { in: classroomIds },
        },
      },
    },
  })

  const status: SyncStatus = {
    hasGoogleAccount: !!googleAccount,
    studentsWithoutHash,
    totalStudents,
  }

  return NextResponse.json(status)
}

/**
 * POST: Run sync (with optional dryRun)
 * Matches local students to Google Classroom students by name
 */
export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { dryRun = true } = body as { dryRun?: boolean }

  const accessToken = await getValidAccessToken(session.user.id)

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Google account not connected or token expired' },
      { status: 401 }
    )
  }

  try {
    // Fetch all Google Classroom students for this teacher
    const allCourses = await fetchAllCourses(accessToken)
    const googleStudentsMap = new Map<string, GoogleStudent>()

    for (const course of allCourses) {
      const students = await fetchCourseStudents(accessToken, course.id)
      for (const student of students) {
        // Use Google userId as key to dedupe across courses
        if (!googleStudentsMap.has(student.userId)) {
          googleStudentsMap.set(student.userId, student)
        }
      }
    }

    // Get all students in teacher's classrooms without googleUserIdHash
    const teacherClassrooms = await prisma.classroom.findMany({
      where: { teacherId: session.user.id },
      select: { id: true },
    })

    const classroomIds = teacherClassrooms.map((c) => c.id)

    const localStudents = await prisma.student.findMany({
      where: {
        googleUserIdHash: null,
        classrooms: {
          some: {
            classroomId: { in: classroomIds },
          },
        },
      },
    })

    // Build name-based lookup for local students
    // Key: "firstname lastname" (lowercase)
    // Value: array of student records (for conflict detection)
    const localStudentsByName = new Map<
      string,
      { id: string; firstName: string; lastName: string }[]
    >()

    for (const student of localStudents) {
      const firstName = decrypt(student.firstName)
      const lastName = decrypt(student.lastName)
      const nameKey = `${firstName} ${lastName}`.toLowerCase()

      const existing = localStudentsByName.get(nameKey) || []
      existing.push({ id: student.id, firstName, lastName })
      localStudentsByName.set(nameKey, existing)
    }

    // Match Google students to local students
    const matched: SyncMatch[] = []
    const unmatched: string[] = []
    const conflicts: SyncConflict[] = []

    for (const [googleUserId, googleStudent] of googleStudentsMap) {
      const googleName = googleStudent.profile.name.fullName
      const googleNameKey = `${googleStudent.profile.name.givenName} ${googleStudent.profile.name.familyName}`.toLowerCase()

      const matchingLocalStudents = localStudentsByName.get(googleNameKey)

      if (!matchingLocalStudents || matchingLocalStudents.length === 0) {
        unmatched.push(googleName)
      } else if (matchingLocalStudents.length === 1) {
        matched.push({
          studentId: matchingLocalStudents[0].id,
          studentName: `${matchingLocalStudents[0].firstName} ${matchingLocalStudents[0].lastName}`,
          googleUserId,
        })
      } else {
        // Multiple local students with same name - conflict
        conflicts.push({
          googleName,
          matchingStudents: matchingLocalStudents.map((s) => ({
            id: s.id,
            name: `${s.firstName} ${s.lastName}`,
          })),
        })
      }
    }

    let updated = 0

    // If not dry run, actually update the students
    if (!dryRun) {
      for (const match of matched) {
        const googleUserIdHash = hashGoogleUserId(match.googleUserId)

        await prisma.student.update({
          where: { id: match.studentId },
          data: { googleUserIdHash },
        })
        updated++
      }
    }

    const result: SyncResult = {
      matched,
      unmatched,
      conflicts,
      updated,
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('Sync error:', err)
    return NextResponse.json(
      { error: 'Failed to sync students' },
      { status: 500 }
    )
  }
}
