import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/classrooms/[id] - Get a single classroom
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const classroom = await prisma.classroom.findFirst({
      where: {
        id,
        teacherId: session.user.id
      },
      include: {
        _count: {
          select: { students: true }
        }
      }
    })

    if (!classroom) {
      return NextResponse.json(
        { error: 'Classroom not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ classroom })
  } catch (error) {
    console.error('Error fetching classroom:', error)
    return NextResponse.json(
      { error: 'Failed to fetch classroom' },
      { status: 500 }
    )
  }
}

// PATCH /api/classrooms/[id] - Update a classroom
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { name, isActive } = await request.json()

    // Verify ownership
    const existing = await prisma.classroom.findFirst({
      where: {
        id,
        teacherId: session.user.id
      }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Classroom not found' },
        { status: 404 }
      )
    }

    const updateData: { name?: string; isActive?: boolean } = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Classroom name cannot be empty' },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive)
    }

    const classroom = await prisma.classroom.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ classroom })
  } catch (error) {
    console.error('Error updating classroom:', error)
    return NextResponse.json(
      { error: 'Failed to update classroom' },
      { status: 500 }
    )
  }
}

// DELETE /api/classrooms/[id] - Delete a classroom
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify ownership
    const existing = await prisma.classroom.findFirst({
      where: {
        id,
        teacherId: session.user.id
      }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Classroom not found' },
        { status: 404 }
      )
    }

    await prisma.classroom.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting classroom:', error)
    return NextResponse.json(
      { error: 'Failed to delete classroom' },
      { status: 500 }
    )
  }
}
