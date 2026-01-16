import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'

type RouteParams = { params: Promise<{ id: string }> }

type CSVStudent = {
  firstName: string
  lastName: string
}

// POST /api/classrooms/[id]/students/bulk - Bulk upload students via CSV data
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    const { id: classroomId } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify classroom ownership
    const classroom = await prisma.classroom.findFirst({
      where: { id: classroomId, teacherId: session.user.id }
    })

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 })
    }

    const { students } = await request.json() as { students: CSVStudent[] }

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { error: 'No students provided' },
        { status: 400 }
      )
    }

    // Validate all students have required fields
    const invalidStudents = students.filter(
      (s) => !s.firstName?.trim() || !s.lastName?.trim()
    )

    if (invalidStudents.length > 0) {
      return NextResponse.json(
        { error: 'All students must have first name and last name' },
        { status: 400 }
      )
    }

    // Create all students and enrollments in a transaction
    const results = await prisma.$transaction(async (tx) => {
      const created: { id: string; firstName: string; lastName: string; cardId: string }[] = []
      const errors: { row: number; error: string }[] = []

      for (let i = 0; i < students.length; i++) {
        const { firstName, lastName } = students[i]

        try {
          const student = await tx.student.create({
            data: {
              firstName: encrypt(firstName.trim()),
              lastName: encrypt(lastName.trim())
            }
          })

          await tx.classroomStudent.create({
            data: {
              studentId: student.id,
              classroomId
            }
          })

          created.push({
            id: student.id,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            cardId: student.cardId
          })
        } catch (err) {
          errors.push({
            row: i + 1,
            error: err instanceof Error ? err.message : 'Unknown error'
          })
        }
      }

      return { created, errors }
    })

    return NextResponse.json({
      success: true,
      created: results.created.length,
      students: results.created,
      errors: results.errors
    }, { status: 201 })
  } catch (error) {
    console.error('Error bulk uploading students:', error)
    return NextResponse.json(
      { error: 'Failed to upload students' },
      { status: 500 }
    )
  }
}
