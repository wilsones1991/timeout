import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/encryption'

type RouteParams = { params: Promise<{ id: string; studentId: string }> }

// GET /api/classrooms/[id]/students/[studentId] - Get a single student
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    const { id: classroomId, studentId } = await params

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

    // Get student with enrollment verification
    const enrollment = await prisma.classroomStudent.findUnique({
      where: {
        studentId_classroomId: { studentId, classroomId }
      },
      include: { student: true }
    })

    if (!enrollment) {
      return NextResponse.json({ error: 'Student not found in this classroom' }, { status: 404 })
    }

    return NextResponse.json({
      student: {
        id: enrollment.student.id,
        firstName: decrypt(enrollment.student.firstName),
        lastName: decrypt(enrollment.student.lastName),
        cardId: enrollment.student.cardId,
        enrolledAt: enrollment.enrolledAt
      }
    })
  } catch (error) {
    console.error('Error fetching student:', error)
    return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 })
  }
}

// PATCH /api/classrooms/[id]/students/[studentId] - Update a student
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    const { id: classroomId, studentId } = await params

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

    // Verify student is in classroom
    const enrollment = await prisma.classroomStudent.findUnique({
      where: {
        studentId_classroomId: { studentId, classroomId }
      }
    })

    if (!enrollment) {
      return NextResponse.json({ error: 'Student not found in this classroom' }, { status: 404 })
    }

    const { firstName, lastName } = await request.json()

    const updateData: { firstName?: string; lastName?: string } = {}

    if (firstName !== undefined) {
      if (typeof firstName !== 'string' || firstName.trim().length === 0) {
        return NextResponse.json({ error: 'First name cannot be empty' }, { status: 400 })
      }
      updateData.firstName = encrypt(firstName.trim())
    }

    if (lastName !== undefined) {
      if (typeof lastName !== 'string' || lastName.trim().length === 0) {
        return NextResponse.json({ error: 'Last name cannot be empty' }, { status: 400 })
      }
      updateData.lastName = encrypt(lastName.trim())
    }

    const student = await prisma.student.update({
      where: { id: studentId },
      data: updateData
    })

    return NextResponse.json({
      student: {
        id: student.id,
        firstName: decrypt(student.firstName),
        lastName: decrypt(student.lastName),
        cardId: student.cardId
      }
    })
  } catch (error) {
    console.error('Error updating student:', error)
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 })
  }
}

// DELETE /api/classrooms/[id]/students/[studentId] - Remove student from classroom
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    const { id: classroomId, studentId } = await params

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

    // Remove enrollment (not the student record - they may be in other classrooms)
    const enrollment = await prisma.classroomStudent.findUnique({
      where: {
        studentId_classroomId: { studentId, classroomId }
      }
    })

    if (!enrollment) {
      return NextResponse.json({ error: 'Student not found in this classroom' }, { status: 404 })
    }

    await prisma.classroomStudent.delete({
      where: {
        studentId_classroomId: { studentId, classroomId }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing student:', error)
    return NextResponse.json({ error: 'Failed to remove student' }, { status: 500 })
  }
}
