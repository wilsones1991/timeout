import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'

type RouteParams = { params: Promise<{ id: string }> }

// Helper to get next waitlist position for a destination
async function getNextWaitlistPosition(classroomId: string, destinationId: string): Promise<number> {
  const maxPosition = await prisma.waitListEntry.aggregate({
    where: {
      classroomId,
      destinationId,
      status: { in: ['waiting', 'approved'] }
    },
    _max: { position: true }
  })
  return (maxPosition._max.position || 0) + 1
}

// Helper to promote next waiting student for a destination
async function promoteNextWaiting(classroomId: string, destinationId: string): Promise<void> {
  const nextWaiting = await prisma.waitListEntry.findFirst({
    where: {
      classroomId,
      destinationId,
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

// Helper to reposition waitlist entries after one is removed/checked_out
async function repositionWaitlist(classroomId: string, destinationId: string): Promise<void> {
  const entries = await prisma.waitListEntry.findMany({
    where: {
      classroomId,
      destinationId,
      status: { in: ['waiting', 'approved'] }
    },
    orderBy: { position: 'asc' }
  })

  // Update positions sequentially starting from 1
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].position !== i + 1) {
      await prisma.waitListEntry.update({
        where: { id: entries[i].id },
        data: { position: i + 1 }
      })
    }
  }
}

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
    const { studentId, action, destination, manualOverride, bypassWaitlist } = body

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

    let waitlisted = false
    let waitlistPosition = 0

    if (action === 'out') {
      // Check out
      if (activeCheckOut) {
        return NextResponse.json(
          { error: 'Student is already checked out' },
          { status: 409 }
        )
      }

      // Check if student already has a waiting/approved entry
      const existingWaitlistEntry = await prisma.waitListEntry.findFirst({
        where: {
          studentId,
          classroomId,
          status: { in: ['waiting', 'approved'] }
        },
        include: { destination: true }
      })

      if (existingWaitlistEntry) {
        if (existingWaitlistEntry.status === 'approved') {
          // Student is approved - allow checkout
          await prisma.$transaction([
            // Create checkout record
            prisma.checkIn.create({
              data: {
                studentId,
                classroomId,
                destination: existingWaitlistEntry.destination.name,
                manualOverride: manualOverride || false
              }
            }),
            // Mark waitlist entry as checked_out
            prisma.waitListEntry.update({
              where: { id: existingWaitlistEntry.id },
              data: { status: 'checked_out' }
            })
          ])

          // Reposition remaining waitlist entries
          await repositionWaitlist(classroomId, existingWaitlistEntry.destinationId)
        } else {
          // Already on waitlist - return their position
          return NextResponse.json({
            success: true,
            action: 'out',
            waitlisted: true,
            position: existingWaitlistEntry.position,
            destination: existingWaitlistEntry.destination.name,
            queue: await getQueue(classroomId)
          })
        }
      } else {
        // New checkout - check destination capacity
        const dest = destination ? await prisma.destination.findFirst({
          where: { classroomId, name: destination }
        }) : null

        if (dest?.capacity && !bypassWaitlist) {
          // Count current checkouts for this destination
          const currentlyOut = await prisma.checkIn.count({
            where: {
              classroomId,
              destination: dest.name,
              checkInAt: null
            }
          })

          // Also count approved entries (reserved spots)
          const approvedWaiting = await prisma.waitListEntry.count({
            where: {
              classroomId,
              destinationId: dest.id,
              status: 'approved'
            }
          })

          // Destination is "full" if currently out + approved reservations >= capacity
          if (currentlyOut + approvedWaiting >= dest.capacity) {
            // At capacity - add to waitlist
            const position = await getNextWaitlistPosition(classroomId, dest.id)

            await prisma.waitListEntry.create({
              data: {
                studentId,
                classroomId,
                destinationId: dest.id,
                position
              }
            })

            waitlisted = true
            waitlistPosition = position
          } else {
            // Under capacity - normal checkout
            await prisma.checkIn.create({
              data: {
                studentId,
                classroomId,
                destination: destination || null,
                manualOverride: manualOverride || false
              }
            })
          }
        } else {
          // No capacity limit - normal checkout
          await prisma.checkIn.create({
            data: {
              studentId,
              classroomId,
              destination: destination || null,
              manualOverride: manualOverride || false
            }
          })
        }
      }
    } else {
      // Check in
      if (!activeCheckOut) {
        return NextResponse.json(
          { error: 'Student is not checked out' },
          { status: 409 }
        )
      }

      const returningDestination = activeCheckOut.destination

      // Update the checkout record with check-in time
      await prisma.checkIn.update({
        where: { id: activeCheckOut.id },
        data: {
          checkInAt: new Date(),
          manualOverride: manualOverride || activeCheckOut.manualOverride
        }
      })

      // Promote next waiting student for this destination
      if (returningDestination) {
        const dest = await prisma.destination.findFirst({
          where: { classroomId, name: returningDestination }
        })

        if (dest) {
          await promoteNextWaiting(classroomId, dest.id)
        }
      }
    }

    // Return updated queue
    const queue = await getQueue(classroomId)

    if (waitlisted) {
      return NextResponse.json({
        success: true,
        action,
        waitlisted: true,
        position: waitlistPosition,
        destination,
        queue
      })
    }

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

// Helper to get current queue
async function getQueue(classroomId: string) {
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
  return activeCheckOuts.map(checkIn => ({
    id: checkIn.id,
    studentId: checkIn.studentId,
    studentName: `${decrypt(checkIn.student.firstName)} ${decrypt(checkIn.student.lastName)}`,
    checkOutAt: checkIn.checkOutAt.toISOString(),
    destination: checkIn.destination,
    durationMinutes: Math.floor((now.getTime() - checkIn.checkOutAt.getTime()) / 60000)
  }))
}
