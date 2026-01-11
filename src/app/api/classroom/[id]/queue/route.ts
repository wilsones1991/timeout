import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/classroom/[id]/queue - Get current queue of checked-out students
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

    // Get students currently checked out
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
      durationMinutes: Math.floor((now.getTime() - checkIn.checkOutAt.getTime()) / 60000)
    }))

    return NextResponse.json({ queue })
  } catch (error) {
    console.error('Error fetching queue:', error)
    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 })
  }
}
