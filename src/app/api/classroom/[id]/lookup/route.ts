import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/classroom/[id]/lookup?cardId=xxx - Look up student by card ID
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    const { id: classroomId } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const cardId = url.searchParams.get('cardId')

    if (!cardId) {
      return NextResponse.json({ error: 'Card ID is required' }, { status: 400 })
    }

    // Verify classroom ownership
    const classroom = await prisma.classroom.findFirst({
      where: { id: classroomId, teacherId: session.user.id }
    })

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 })
    }

    // Find student by cardId
    const student = await prisma.student.findUnique({
      where: { cardId }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Verify student is enrolled in this classroom
    const enrollment = await prisma.classroomStudent.findUnique({
      where: {
        studentId_classroomId: {
          studentId: student.id,
          classroomId
        }
      }
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Student is not enrolled in this classroom' },
        { status: 404 }
      )
    }

    // Check if student is currently checked out
    const activeCheckOut = await prisma.checkIn.findFirst({
      where: {
        studentId: student.id,
        classroomId,
        checkInAt: null
      }
    })

    return NextResponse.json({
      student: {
        id: student.id,
        firstName: decrypt(student.firstName),
        lastName: decrypt(student.lastName),
        cardId: student.cardId,
        status: activeCheckOut ? 'out' : 'in',
        checkOutTime: activeCheckOut?.checkOutAt.toISOString()
      }
    })
  } catch (error) {
    console.error('Error looking up student:', error)
    return NextResponse.json({ error: 'Failed to look up student' }, { status: 500 })
  }
}
