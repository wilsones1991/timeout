import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import StudentList from '@/components/StudentList'
import DestinationManager from '@/components/DestinationManager'
import WaitListManager from '@/components/WaitListManager'
import WaitListWidgetButton from '@/components/WaitListWidgetButton'
import KioskModeGuard from '@/components/KioskModeGuard'

type Props = {
  params: Promise<{ id: string }>
}

export default async function ClassroomPage({ params }: Props) {
  const session = await auth()
  const { id } = await params

  if (!session?.user) {
    redirect('/login')
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
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <KioskModeGuard />
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {classroom.name}
                </h1>
                <p className="text-sm text-gray-500">
                  {classroom._count.students} {classroom._count.students === 1 ? 'student' : 'students'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <WaitListWidgetButton classroomId={id} />
              <Link
                href={`/dashboard/classroom/${id}/history`}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                History
              </Link>
              <Link
                href={`/classroom/${id}/kiosk-launch`}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Launch Kiosk
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <StudentList classroomId={id} classroomName={classroom.name} />
        <DestinationManager classroomId={id} />
      </main>
    </div>
  )
}
