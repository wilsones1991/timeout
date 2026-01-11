import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/encryption'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/classrooms/[id]/students - List all students in a classroom
export async function GET(request: Request, { params }: RouteParams) {
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

    // Get students enrolled in this classroom
    const enrollments = await prisma.classroomStudent.findMany({
      where: { classroomId },
      include: {
        student: true
      },
      orderBy: { enrolledAt: 'desc' }
    })

    // Decrypt student names
    const students = enrollments.map(enrollment => ({
      id: enrollment.student.id,
      firstName: decrypt(enrollment.student.firstName),
      lastName: decrypt(enrollment.student.lastName),
      cardId: enrollment.student.cardId,
      enrolledAt: enrollment.enrolledAt,
      createdAt: enrollment.student.createdAt
    }))

    return NextResponse.json({ students })
  } catch (error) {
    console.error('Error fetching students:', error)
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
  }
}

// POST /api/classrooms/[id]/students - Add a student to classroom
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

    const body = await request.json()
    const { firstName, lastName, existingStudentId } = body

    // If adding an existing student by ID
    if (existingStudentId) {
      const existingStudent = await prisma.student.findUnique({
        where: { id: existingStudentId }
      })

      if (!existingStudent) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }

      // Check if already enrolled
      const existingEnrollment = await prisma.classroomStudent.findUnique({
        where: {
          studentId_classroomId: {
            studentId: existingStudentId,
            classroomId
          }
        }
      })

      if (existingEnrollment) {
        return NextResponse.json(
          { error: 'Student is already enrolled in this classroom' },
          { status: 409 }
        )
      }

      // Create enrollment
      await prisma.classroomStudent.create({
        data: {
          studentId: existingStudentId,
          classroomId
        }
      })

      return NextResponse.json({
        student: {
          id: existingStudent.id,
          firstName: decrypt(existingStudent.firstName),
          lastName: decrypt(existingStudent.lastName),
          cardId: existingStudent.cardId
        }
      }, { status: 201 })
    }

    // Creating a new student
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      )
    }

    // Encrypt student names
    const encryptedFirstName = encrypt(firstName.trim())
    const encryptedLastName = encrypt(lastName.trim())

    // Create student and enrollment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          firstName: encryptedFirstName,
          lastName: encryptedLastName
        }
      })

      await tx.classroomStudent.create({
        data: {
          studentId: student.id,
          classroomId
        }
      })

      return student
    })

    return NextResponse.json({
      student: {
        id: result.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        cardId: result.cardId
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error adding student:', error)
    return NextResponse.json({ error: 'Failed to add student' }, { status: 500 })
  }
}
