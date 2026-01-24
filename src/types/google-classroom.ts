// Types for Google Classroom API responses

export interface GoogleCourse {
  id: string
  name: string
  section?: string
  descriptionHeading?: string
  courseState: 'ACTIVE' | 'ARCHIVED' | 'PROVISIONED' | 'DECLINED' | 'SUSPENDED'
  enrollmentCode?: string
}

export interface GoogleStudentProfile {
  id: string
  name: {
    givenName: string
    familyName: string
    fullName: string
  }
  emailAddress?: string
}

export interface GoogleStudent {
  courseId: string
  userId: string
  profile: GoogleStudentProfile
}

export interface GoogleCoursesResponse {
  courses?: GoogleCourse[]
  nextPageToken?: string
}

export interface GoogleStudentsResponse {
  students?: GoogleStudent[]
  nextPageToken?: string
}

// Types for our API responses
export interface CourseWithStudentCount extends GoogleCourse {
  studentCount: number
}

export interface ImportResult {
  courseName: string
  classroomId: string
  studentsImported: number
  success: boolean
  error?: string
}
