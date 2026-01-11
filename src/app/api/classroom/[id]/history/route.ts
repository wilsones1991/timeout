import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encryption'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/classroom/[id]/history - Get check-in/out history
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

    // Parse query parameters
    const url = new URL(request.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const studentId = url.searchParams.get('studentId')
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')

    // Build where clause
    const where: {
      classroomId: string
      studentId?: string
      checkOutAt?: { gte?: Date; lte?: Date }
    } = { classroomId }

    if (studentId) {
      where.studentId = studentId
    }

    if (dateFrom || dateTo) {
      where.checkOutAt = {}
      if (dateFrom) {
        where.checkOutAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        // Add a day to include the entire end date
        const endDate = new Date(dateTo)
        endDate.setDate(endDate.getDate() + 1)
        where.checkOutAt.lte = endDate
      }
    }

    // Get total count
    const total = await prisma.checkIn.count({ where })

    // Get history records
    const records = await prisma.checkIn.findMany({
      where,
      include: {
        student: true
      },
      orderBy: {
        checkOutAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    const history = records.map(record => ({
      id: record.id,
      studentId: record.studentId,
      studentName: `${decrypt(record.student.firstName)} ${decrypt(record.student.lastName)}`,
      checkOutAt: record.checkOutAt.toISOString(),
      checkInAt: record.checkInAt?.toISOString() || null,
      durationMinutes: record.checkInAt
        ? Math.floor((record.checkInAt.getTime() - record.checkOutAt.getTime()) / 60000)
        : null,
      manualOverride: record.manualOverride,
      isActive: !record.checkInAt
    }))

    return NextResponse.json({
      history,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  } catch (error) {
    console.error('Error fetching history:', error)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
