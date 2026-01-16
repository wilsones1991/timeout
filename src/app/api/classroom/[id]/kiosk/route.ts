import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'

type RouteParams = { params: Promise<{ id: string }> }

const DEFAULT_DESTINATIONS = [
  { name: 'Bathroom', sortOrder: 0 },
  { name: 'Office', sortOrder: 1 },
]

// GET /api/classroom/[id]/kiosk - Get classroom info and queue for kiosk
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

    // Get destinations (auto-create defaults if none exist)
    let destinations = await prisma.destination.findMany({
      where: { classroomId, isActive: true },
      orderBy: { sortOrder: 'asc' }
    })

    if (destinations.length === 0) {
      await prisma.destination.createMany({
        data: DEFAULT_DESTINATIONS.map(d => ({
          ...d,
          classroomId
        }))
      })

      destinations = await prisma.destination.findMany({
        where: { classroomId, isActive: true },
        orderBy: { sortOrder: 'asc' }
      })
    }

    // Get students currently checked out (no check-in time)
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

    // Get capacity info for each destination
    const destinationsWithCounts = await Promise.all(
      destinations.map(async (d) => {
        const currentCount = await prisma.checkIn.count({
          where: {
            classroomId,
            destination: d.name,
            checkInAt: null
          }
        })

        const approvedCount = await prisma.waitListEntry.count({
          where: {
            classroomId,
            destinationId: d.id,
            status: 'approved'
          }
        })

        const waitlistCount = await prisma.waitListEntry.count({
          where: {
            classroomId,
            destinationId: d.id,
            status: { in: ['waiting', 'approved'] }
          }
        })

        return {
          id: d.id,
          name: d.name,
          capacity: d.capacity,
          currentCount,
          approvedCount,
          waitlistCount
        }
      })
    )

    return NextResponse.json({
      classroom: {
        id: classroom.id,
        name: classroom.name
      },
      destinations: destinationsWithCounts,
      queue
    })
  } catch (error) {
    console.error('Error fetching kiosk data:', error)
    return NextResponse.json({ error: 'Failed to fetch kiosk data' }, { status: 500 })
  }
}
