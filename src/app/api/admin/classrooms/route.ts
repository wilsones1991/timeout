import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/classrooms - List all classrooms for the current teacher
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const classrooms = await prisma.classroom.findMany({
      where: { teacherId: session.user.id },
      include: {
        _count: {
          select: { students: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ classrooms })
  } catch (error) {
    console.error('Error fetching classrooms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch classrooms' },
      { status: 500 }
    )
  }
}

// POST /api/classrooms - Create a new classroom
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { name } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Classroom name is required' },
        { status: 400 }
      )
    }

    const classroom = await prisma.classroom.create({
      data: {
        name: name.trim(),
        teacherId: session.user.id
      }
    })

    return NextResponse.json({ classroom }, { status: 201 })
  } catch (error) {
    console.error('Error creating classroom:', error)
    return NextResponse.json(
      { error: 'Failed to create classroom' },
      { status: 500 }
    )
  }
}
