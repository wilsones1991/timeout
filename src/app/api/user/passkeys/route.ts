import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getUserPasskeys, deletePasskey, renamePasskey } from '@/lib/webauthn'

// GET /api/user/passkeys - List user's passkeys
export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const passkeys = await getUserPasskeys(session.user.id)
    return NextResponse.json({ passkeys })
  } catch (error) {
    console.error('Error fetching passkeys:', error)
    return NextResponse.json(
      { error: 'Failed to fetch passkeys' },
      { status: 500 }
    )
  }
}

// DELETE /api/user/passkeys - Delete a passkey
export async function DELETE(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const passkeyId = searchParams.get('id')

    if (!passkeyId) {
      return NextResponse.json(
        { error: 'Passkey ID is required' },
        { status: 400 }
      )
    }

    const deleted = await deletePasskey(passkeyId, session.user.id)

    if (!deleted) {
      return NextResponse.json({ error: 'Passkey not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting passkey:', error)
    return NextResponse.json(
      { error: 'Failed to delete passkey' },
      { status: 500 }
    )
  }
}

// PATCH /api/user/passkeys - Rename a passkey
export async function PATCH(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, name } = body as { id?: string; name?: string }

    if (!id || !name) {
      return NextResponse.json(
        { error: 'Passkey ID and name are required' },
        { status: 400 }
      )
    }

    const renamed = await renamePasskey(id, session.user.id, name)

    if (!renamed) {
      return NextResponse.json({ error: 'Passkey not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error renaming passkey:', error)
    return NextResponse.json(
      { error: 'Failed to rename passkey' },
      { status: 500 }
    )
  }
}
