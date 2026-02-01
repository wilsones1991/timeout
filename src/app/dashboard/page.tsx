import { redirect } from 'next/navigation'
import { auth, signOut } from '@/lib/auth'
import ClassroomList from '@/components/ClassroomList'
import DashboardHeader from '@/components/DashboardHeader'
import GoogleSyncBanner from '@/components/GoogleSyncBanner'

async function handleSignOut() {
  'use server'
  await signOut({ redirectTo: '/login' })
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <>
      <DashboardHeader
        userName={session.user.name || session.user.email || 'User'}
        onSignOut={handleSignOut}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GoogleSyncBanner />
        <ClassroomList />
      </main>
    </>
  )
}
