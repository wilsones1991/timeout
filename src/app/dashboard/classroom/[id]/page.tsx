import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import StudentList from '@/components/StudentList'

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
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StudentList classroomId={id} />
      </main>
    </div>
  )
}
