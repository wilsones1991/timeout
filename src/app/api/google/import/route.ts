import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'
import { hashGoogleUserId } from '@/lib/hash'
import {
  getValidAccessToken,
  fetchAllCourses,
  fetchCourseStudents,
} from '@/lib/google-classroom'
import type { ImportResult } from '@/types/google-classroom'

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { courseIds } = body as { courseIds: string[] }

  if (!Array.isArray(courseIds) || courseIds.length === 0) {
    return NextResponse.json(
      { error: 'No courses selected for import' },
      { status: 400 }
    )
  }

  const accessToken = await getValidAccessToken(session.user.id)

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Google account not connected or token expired' },
      { status: 401 }
    )
  }

  try {
    // Fetch course details to get names
    const allCourses = await fetchAllCourses(accessToken)
    const selectedCourses = allCourses.filter((c) => courseIds.includes(c.id))

    if (selectedCourses.length === 0) {
      return NextResponse.json(
        { error: 'Selected courses not found' },
        { status: 404 }
      )
    }

    // Get existing classroom names for this teacher to handle duplicates
    const existingClassrooms = await prisma.classroom.findMany({
      where: { teacherId: session.user.id },
      select: { name: true },
    })
    const existingNames = new Set(existingClassrooms.map((c) => c.name))

    const results: ImportResult[] = []

    // Import each course
    for (const course of selectedCourses) {
      try {
        // Fetch students for this course
        const googleStudents = await fetchCourseStudents(accessToken, course.id)

        // Determine classroom name (handle duplicates)
        let classroomName = course.name
        if (course.section) {
          classroomName = `${course.name} - ${course.section}`
        }

        // Add "(imported)" suffix if name already exists
        if (existingNames.has(classroomName)) {
          let suffix = 1
          let newName = `${classroomName} (imported)`
          while (existingNames.has(newName)) {
            suffix++
            newName = `${classroomName} (imported ${suffix})`
          }
          classroomName = newName
        }

        // Create classroom and students in a transaction
        const classroom = await prisma.$transaction(async (tx) => {
          // Create the classroom
          const newClassroom = await tx.classroom.create({
            data: {
              name: classroomName,
              teacherId: session.user.id,
              isActive: true,
            },
          })

          // Create or reuse students and enroll them
          for (const googleStudent of googleStudents) {
            const firstName = googleStudent.profile.name.givenName
            const lastName = googleStudent.profile.name.familyName
            const googleUserIdHash = hashGoogleUserId(googleStudent.userId)

            // Check if student already exists (imported by another teacher)
            let student = await tx.student.findUnique({
              where: { googleUserIdHash },
            })

            if (!student) {
              // Create new student with encrypted name and Google ID hash
              student = await tx.student.create({
                data: {
                  firstName: encrypt(firstName),
                  lastName: encrypt(lastName),
                  googleUserIdHash,
                  // cardId is auto-generated
                },
              })
            }

            // Check if student is already enrolled in this classroom
            const existingEnrollment = await tx.classroomStudent.findUnique({
              where: {
                studentId_classroomId: {
                  studentId: student.id,
                  classroomId: newClassroom.id,
                },
              },
            })

            // Only enroll if not already enrolled
            if (!existingEnrollment) {
              await tx.classroomStudent.create({
                data: {
                  studentId: student.id,
                  classroomId: newClassroom.id,
                },
              })
            }
          }

          return newClassroom
        })

        // Track the name as used
        existingNames.add(classroomName)

        results.push({
          courseName: course.name,
          classroomId: classroom.id,
          studentsImported: googleStudents.length,
          success: true,
        })
      } catch (err) {
        console.error(`Error importing course ${course.name}:`, err)
        results.push({
          courseName: course.name,
          classroomId: '',
          studentsImported: 0,
          success: false,
          error:
            err instanceof Error ? err.message : 'Failed to import course',
        })
      }
    }

    // Calculate summary
    const successCount = results.filter((r) => r.success).length
    const totalStudents = results.reduce((sum, r) => sum + r.studentsImported, 0)

    return NextResponse.json({
      results,
      summary: {
        coursesImported: successCount,
        totalCourses: results.length,
        totalStudents,
      },
    })
  } catch (err) {
    console.error('Import error:', err)
    return NextResponse.json(
      { error: 'Failed to import from Google Classroom' },
      { status: 500 }
    )
  }
}
