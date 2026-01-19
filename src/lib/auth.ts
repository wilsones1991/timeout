import NextAuth from 'next-auth'
import { encode } from 'next-auth/jwt'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from './prisma'
import { decrypt } from './encryption'
import { cookies } from 'next/headers'

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = (credentials.email as string).toLowerCase()
        const password = credentials.password as string

        const user = await prisma.user.findUnique({
          where: { email }
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await compare(password, user.passwordHash)

        if (!isPasswordValid) {
          return null
        }

        // Decrypt the user name if it exists
        const decryptedName = user.name ? decrypt(user.name) : null

        return {
          id: user.id,
          email: user.email,
          name: decryptedName
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 12 * 60 * 60 // 12 hours in seconds
  },
  pages: {
    signIn: '/login'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    }
  }
})

/**
 * Create a session for a user programmatically (used for passkey authentication)
 */
export async function createSessionForUser(user: {
  id: string
  email: string
  name: string | null
}) {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is not set')
  }

  const isSecure = process.env.NODE_ENV === 'production'
  const cookieName = isSecure
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token'

  // Create the JWT token with the same structure as NextAuth
  // The salt is required in v5 and should match the cookie name
  const token = await encode({
    token: {
      id: user.id,
      email: user.email,
      name: user.name,
      sub: user.id,
    },
    secret,
    salt: cookieName,
    maxAge: 12 * 60 * 60, // 12 hours
  })

  // Set the session cookie
  const cookieStore = await cookies()

  cookieStore.set(cookieName, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 12 * 60 * 60, // 12 hours
  })

  return { success: true }
}
