import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type RouteParams = { params: Promise<{ id: string; destId: string }> }

// PATCH /api/classrooms/[id]/destinations/[destId] - Update a destination
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    const { id: classroomId, destId } = await params

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

    // Verify destination exists and belongs to this classroom
    const existingDestination = await prisma.destination.findFirst({
      where: { id: destId, classroomId }
    })

    if (!existingDestination) {
      return NextResponse.json({ error: 'Destination not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, sortOrder, isActive, capacity } = body

    // Build update data
    const updateData: { name?: string; sortOrder?: number; isActive?: boolean; capacity?: number | null } = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Destination name cannot be empty' }, { status: 400 })
      }
      updateData.name = name.trim()
    }

    if (sortOrder !== undefined) {
      if (typeof sortOrder !== 'number') {
        return NextResponse.json({ error: 'Sort order must be a number' }, { status: 400 })
      }
      updateData.sortOrder = sortOrder
    }

    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 })
      }
      updateData.isActive = isActive
    }

    if (capacity !== undefined) {
      // Accept null, 0, or empty string as "unlimited"
      if (capacity === null || capacity === 0 || capacity === '') {
        updateData.capacity = null
      } else if (typeof capacity === 'number' && capacity > 0) {
        // Check if another destination already has a capacity limit
        // Only one destination per classroom can have a waiting room
        const existingWithCapacity = await prisma.destination.findFirst({
          where: {
            classroomId,
            isActive: true,
            capacity: { not: null },
            id: { not: destId } // Exclude current destination
          }
        })

        if (existingWithCapacity) {
          return NextResponse.json(
            { error: `Only one destination can have a waiting room. "${existingWithCapacity.name}" already has a capacity limit.` },
            { status: 400 }
          )
        }

        updateData.capacity = capacity
      }
    }

    const destination = await prisma.destination.update({
      where: { id: destId },
      data: updateData
    })

    return NextResponse.json({ destination })
  } catch (error) {
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A destination with this name already exists' },
        { status: 409 }
      )
    }
    console.error('Error updating destination:', error)
    return NextResponse.json({ error: 'Failed to update destination' }, { status: 500 })
  }
}

// DELETE /api/classrooms/[id]/destinations/[destId] - Delete a destination
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    const { id: classroomId, destId } = await params

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

    // Verify destination exists and belongs to this classroom
    const existingDestination = await prisma.destination.findFirst({
      where: { id: destId, classroomId }
    })

    if (!existingDestination) {
      return NextResponse.json({ error: 'Destination not found' }, { status: 404 })
    }

    await prisma.destination.delete({
      where: { id: destId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting destination:', error)
    return NextResponse.json({ error: 'Failed to delete destination' }, { status: 500 })
  }
}
