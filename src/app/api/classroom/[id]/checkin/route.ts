import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'

type RouteParams = { params: Promise<{ id: string }> }

// POST /api/classroom/[id]/checkin - Check in or out a student
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
    const { studentId, action, destination, manualOverride } = body

    if (!studentId || !action) {
      return NextResponse.json(
        { error: 'Student ID and action are required' },
        { status: 400 }
      )
    }

    if (action !== 'in' && action !== 'out') {
      return NextResponse.json(
        { error: 'Action must be "in" or "out"' },
        { status: 400 }
      )
    }

    // Destination is required for checkout (unless manual override from teacher dashboard)
    if (action === 'out' && !destination && !manualOverride) {
      return NextResponse.json(
        { error: 'Destination is required for checkout' },
        { status: 400 }
      )
    }

    // Verify student exists and is enrolled
    const enrollment = await prisma.classroomStudent.findUnique({
      where: {
        studentId_classroomId: {
          studentId,
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

    // Find any active checkout for this student
    const activeCheckOut = await prisma.checkIn.findFirst({
      where: {
        studentId,
        classroomId,
        checkInAt: null
      }
    })

    if (action === 'out') {
      // Check out
      if (activeCheckOut) {
        return NextResponse.json(
          { error: 'Student is already checked out' },
          { status: 409 }
        )
      }

      // Create new checkout record
      await prisma.checkIn.create({
        data: {
          studentId,
          classroomId,
          destination: destination || null,
          manualOverride: manualOverride || false
        }
      })
    } else {
      // Check in
      if (!activeCheckOut) {
        return NextResponse.json(
          { error: 'Student is not checked out' },
          { status: 409 }
        )
      }

      // Update the checkout record with check-in time
      await prisma.checkIn.update({
        where: { id: activeCheckOut.id },
        data: {
          checkInAt: new Date(),
          manualOverride: manualOverride || activeCheckOut.manualOverride
        }
      })
    }

    // Return updated queue
    const activeCheckOuts = await prisma.checkIn.findMany({
      where: {
        classroomId,
        checkInAt: null
      },
      include: {
        student: true
      },
      orderBy: {
        checkOutAt: 'asc'
      }
    })

    const now = new Date()
    const queue = activeCheckOuts.map(checkIn => ({
      id: checkIn.id,
      studentId: checkIn.studentId,
      studentName: `${decrypt(checkIn.student.firstName)} ${decrypt(checkIn.student.lastName)}`,
      checkOutAt: checkIn.checkOutAt.toISOString(),
      destination: checkIn.destination,
      durationMinutes: Math.floor((now.getTime() - checkIn.checkOutAt.getTime()) / 60000)
    }))

    return NextResponse.json({
      success: true,
      action,
      queue
    })
  } catch (error) {
    console.error('Error processing check-in/out:', error)
    return NextResponse.json({ error: 'Failed to process check-in/out' }, { status: 500 })
  }
}
