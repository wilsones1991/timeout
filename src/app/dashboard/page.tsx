import { redirect } from 'next/navigation'
import { auth, signOut } from '@/lib/auth'
import ClassroomList from '@/components/ClassroomList'

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Classroom Check-In
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              Welcome, {session.user.name || session.user.email}
            </span>
            <form
              action={async () => {
                'use server'
                await signOut({ redirectTo: '/login' })
              }}
            >
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ClassroomList />
      </main>
    </div>
  )
}
