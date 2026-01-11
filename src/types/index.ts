// Shared TypeScript types for Classroom Check-In/Out System

import type { User, Classroom, Student, ClassroomStudent, CheckIn } from '@/generated/prisma/client'

// Re-export Prisma types for convenience
export type { User, Classroom, Student, ClassroomStudent, CheckIn }

// Extended types with relations
export type UserWithClassrooms = User & {
  classrooms: Classroom[]
}

export type ClassroomWithTeacher = Classroom & {
  teacher: User
}

export type ClassroomWithStudents = Classroom & {
  students: (ClassroomStudent & {
    student: Student
  })[]
}

export type StudentWithClassrooms = Student & {
  classrooms: (ClassroomStudent & {
    classroom: Classroom
  })[]
}

export type CheckInWithDetails = CheckIn & {
  student: Student
  classroom: Classroom
}

// API response types
export type ApiResponse<T> = {
  success: true
  data: T
} | {
  success: false
  error: string
}

// Check-in status for student view
export type StudentStatus = 'in' | 'out'

// Queue item for live display
export type QueueItem = {
  id: string
  studentId: string
  studentName: string
  checkOutAt: Date
  durationMinutes: number
  isExtended: boolean // >15 minutes
}

// Session types for NextAuth
export type SessionUser = {
  id: string
  email: string
  name?: string | null
}
