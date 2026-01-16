import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type RouteParams = { params: Promise<{ id: string }> }

const DEFAULT_DESTINATIONS = [
  { name: 'Bathroom', sortOrder: 0 },
  { name: 'Office', sortOrder: 1 },
]

// GET /api/classrooms/[id]/destinations - List all destinations for a classroom
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

    // Get destinations for this classroom
    let destinations = await prisma.destination.findMany({
      where: { classroomId, isActive: true },
      orderBy: { sortOrder: 'asc' }
    })

    // If no destinations exist, create defaults
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

    return NextResponse.json({ destinations })
  } catch (error) {
    console.error('Error fetching destinations:', error)
    return NextResponse.json({ error: 'Failed to fetch destinations' }, { status: 500 })
  }
}

// POST /api/classrooms/[id]/destinations - Add a destination to classroom
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
    const { name, capacity } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Destination name is required' }, { status: 400 })
    }

    // Validate capacity if provided
    const parsedCapacity = capacity === null || capacity === undefined || capacity === '' || capacity === 0
      ? null
      : typeof capacity === 'number' && capacity > 0
        ? capacity
        : null

    // Get the highest sortOrder
    const maxSortOrder = await prisma.destination.aggregate({
      where: { classroomId },
      _max: { sortOrder: true }
    })

    const nextSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1

    // Create destination
    const destination = await prisma.destination.create({
      data: {
        name: name.trim(),
        classroomId,
        sortOrder: nextSortOrder,
        capacity: parsedCapacity
      }
    })

    return NextResponse.json({ destination }, { status: 201 })
  } catch (error) {
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A destination with this name already exists' },
        { status: 409 }
      )
    }
    console.error('Error adding destination:', error)
    return NextResponse.json({ error: 'Failed to add destination' }, { status: 500 })
  }
}
