import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/classroom/[id]/waitlist - Get wait list entries for classroom
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

    // Get all waiting and approved entries
    const entries = await prisma.waitListEntry.findMany({
      where: {
        classroomId,
        status: { in: ['waiting', 'approved'] }
      },
      include: {
        student: true,
        destination: true
      },
      orderBy: [
        { destinationId: 'asc' },
        { position: 'asc' }
      ]
    })

    return NextResponse.json({
      classroom: { id: classroom.id, name: classroom.name },
      entries: entries.map(entry => ({
        id: entry.id,
        studentId: entry.studentId,
        studentName: `${decrypt(entry.student.firstName)} ${decrypt(entry.student.lastName)}`,
        destinationId: entry.destinationId,
        destinationName: entry.destination.name,
        position: entry.position,
        status: entry.status,
        createdAt: entry.createdAt.toISOString(),
        approvedAt: entry.approvedAt?.toISOString() || null
      }))
    })
  } catch (error) {
    console.error('Error fetching wait list:', error)
    return NextResponse.json({ error: 'Failed to fetch wait list' }, { status: 500 })
  }
}

// POST /api/classroom/[id]/waitlist - Teacher management actions
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
    const { action, entryId } = body

    if (!action || !entryId) {
      return NextResponse.json(
        { error: 'Action and entryId are required' },
        { status: 400 }
      )
    }

    // Find the entry
    const entry = await prisma.waitListEntry.findFirst({
      where: {
        id: entryId,
        classroomId,
        status: { in: ['waiting', 'approved'] }
      }
    })

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    switch (action) {
      case 'skip': {
        // Move to end of queue for this destination
        const maxPosition = await prisma.waitListEntry.aggregate({
          where: {
            classroomId,
            destinationId: entry.destinationId,
            status: 'waiting'
          },
          _max: { position: true }
        })

        const newPosition = (maxPosition._max.position || 0) + 1

        // Update this entry's position
        await prisma.waitListEntry.update({
          where: { id: entryId },
          data: {
            position: newPosition,
            status: 'waiting', // Reset to waiting if was approved
            approvedAt: null
          }
        })

        // Reposition entries that were after this one
        await prisma.waitListEntry.updateMany({
          where: {
            classroomId,
            destinationId: entry.destinationId,
            status: 'waiting',
            position: { gt: entry.position },
            id: { not: entryId }
          },
          data: { position: { decrement: 1 } }
        })

        // If entry was approved, promote next waiting
        if (entry.status === 'approved') {
          const nextWaiting = await prisma.waitListEntry.findFirst({
            where: {
              classroomId,
              destinationId: entry.destinationId,
              status: 'waiting'
            },
            orderBy: { position: 'asc' }
          })

          if (nextWaiting) {
            await prisma.waitListEntry.update({
              where: { id: nextWaiting.id },
              data: { status: 'approved', approvedAt: new Date() }
            })
          }
        }
        break
      }

      case 'remove': {
        // Cancel the entry
        await prisma.waitListEntry.update({
          where: { id: entryId },
          data: { status: 'cancelled' }
        })

        // Reposition remaining entries
        await prisma.waitListEntry.updateMany({
          where: {
            classroomId,
            destinationId: entry.destinationId,
            status: 'waiting',
            position: { gt: entry.position }
          },
          data: { position: { decrement: 1 } }
        })

        // If entry was approved, promote next waiting
        if (entry.status === 'approved') {
          const nextWaiting = await prisma.waitListEntry.findFirst({
            where: {
              classroomId,
              destinationId: entry.destinationId,
              status: 'waiting'
            },
            orderBy: { position: 'asc' }
          })

          if (nextWaiting) {
            await prisma.waitListEntry.update({
              where: { id: nextWaiting.id },
              data: { status: 'approved', approvedAt: new Date() }
            })
          }
        }
        break
      }

      case 'approve': {
        // Manually approve this entry (even if not first in line)
        await prisma.waitListEntry.update({
          where: { id: entryId },
          data: { status: 'approved', approvedAt: new Date() }
        })
        break
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: skip, remove, or approve' },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error managing wait list:', error)
    return NextResponse.json({ error: 'Failed to manage wait list' }, { status: 500 })
  }
}
