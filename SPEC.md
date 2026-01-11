# Classroom Check-In/Out System - MVP Specification

## Project Overview

A web application that allows teachers to manage student check-ins and check-outs across multiple classrooms. Students scan ID cards to log when they leave and return to the classroom (e.g., bathroom breaks, office visits). Teachers can view real-time queues of students currently out of the classroom.

**Target Users:** K-12 teachers, particularly secondary education (middle/high school) where students move between multiple classes.

**Deployment Target:** Runs on a spare Chromebook in each classroom, accessible via web browser.

---

## Technical Stack

### Frontend
- **Next.js 14+** (App Router)
- **React 18+**
- **TypeScript**
- **TailwindCSS** for styling
- **shadcn/ui** (optional, for pre-built accessible components)

### Backend
- **Next.js API Routes** (serverless functions)
- **NextAuth.js v5** (Auth.js) for authentication
- **Prisma ORM** for database management
- **PostgreSQL** (production) or **SQLite** (development/simple deployment)

### Infrastructure
- **Vercel** (recommended deployment) or any Node.js hosting
- **Session-based authentication** with 12-hour expiry
- **Server-side rendering** for security and performance

### Development Tools
- **ESLint + Prettier** for code quality
- **Prisma Studio** for database management
- **npm/pnpm** for package management

---

## Core Features (MVP)

### 1. Authentication & Authorization
- Teacher registration and login
- Session-based auth with 12-hour session duration
- Password reset functionality (email-based)
- Role-based access (Teacher only for MVP)

### 2. Classroom Management
- Teachers can create multiple classrooms
- Each classroom has:
  - Name (e.g., "Period 1 - English", "Room 204")
  - Unique access code or URL
  - Active/Inactive status

### 3. Student Management
- Teachers can add students to classrooms via:
  - Manual entry (first name + last name)
  - CSV bulk upload (first name, last name)
- System automatically generates unique UUID for each student's card ID
- Students can be in multiple classrooms
- Student data includes:
  - First name
  - Last name
  - Card ID (UUID, auto-generated)
  - QR code (generated from card ID)
- Teachers can print/export QR codes for physical student ID cards

### 4. Check-In/Out Interface (Student-Facing)
- Clean, simple interface accessible via classroom-specific URL
- Uses Chromebook webcam for QR code scanning
- Student holds QR code card up to camera
- System scans and recognizes student automatically
- Shows: "Welcome [Student Name]"
- Display current status (In or Out)
- Single button: "Check Out" or "Check In"
- Confirmation screen, then returns to camera view
- Requires active teacher session (protected route)
- Fallback: Manual entry option if camera fails

### 5. Live Queue Display
- Real-time display of students currently checked out
- Shows for each student:
  - Name
  - Time they checked out
  - Duration (live updating, e.g., "5 minutes ago")
  - Visual indicator for extended absences (>15 minutes, configurable)
- Automatically updates when students check in/out
- Visible on student-facing interface when teacher is logged in

### 6. Teacher Dashboard
- View all classrooms
- Select classroom to view/manage
- Quick stats: Total students, currently out, average out time
- Access to check-in/out history
- Manual check-in/out override (if student forgets to scan)

### 7. Session Management
- 12-hour session duration (covers full school day)
- Manual "End Session" button
- Auto-logout after 12 hours
- Optional: Manual lock/unlock feature for lunch/breaks

---

## User Stories

### Teacher - Setup & Management

**US-1: Teacher Registration**
- As a teacher, I want to create an account with my email and password so that I can access the system.
- **Acceptance Criteria:**
  - Email validation
  - Password strength requirements (8+ chars, mix of types)
  - Confirmation email sent
  - Redirect to dashboard after registration

**US-2: Create Classroom**
- As a teacher, I want to create a new classroom with a name so that I can manage multiple class periods.
- **Acceptance Criteria:**
  - Teacher can name classroom (e.g., "Period 2 - Algebra")
  - System generates unique classroom ID/URL
  - Classroom appears in teacher's dashboard
  - Teacher can create unlimited classrooms

**US-3: Add Students to Classroom**
- As a teacher, I want to add students individually or via CSV upload so that I can quickly set up my class roster.
- **Acceptance Criteria:**
  - Manual form: Enter first name and last name
  - CSV upload: Template with columns "First Name, Last Name", bulk import
  - System automatically generates unique card ID (UUID) for each student
  - Validation: Duplicate names allowed (different UUIDs)
  - Students appear in classroom roster immediately
  - After creation, teacher can print/export QR codes for student cards

**US-4: View All Classrooms**
- As a teacher, I want to see all my classrooms in one dashboard so that I can quickly navigate between them.
- **Acceptance Criteria:**
  - List/grid view of all classrooms
  - Shows classroom name and number of students
  - Click to enter classroom view
  - Option to edit or delete classroom

**US-4.5: Generate Student QR Code Cards**
- As a teacher, I want to generate and print QR code cards for my students so that they can scan in and out.
- **Acceptance Criteria:**
  - After adding students, option to "Generate QR Cards"
  - Creates printable PDF with QR codes
  - Each card shows: Student name, QR code, classroom name
  - Cards formatted for standard business card or badge paper
  - Option to regenerate individual cards if lost

### Teacher - Daily Use

**US-5: Start Daily Session**
- As a teacher, I want to log in once in the morning and stay logged in all day so that I don't have to repeatedly authenticate.
- **Acceptance Criteria:**
  - Login persists for 12 hours
  - Can access any classroom during session
  - Clear indicator of logged-in status
  - Option to manually end session

**US-6: Access Classroom Check-In Interface**
- As a teacher, I want to open the student-facing check-in interface on a classroom Chromebook so that students can scan in/out.
- **Acceptance Criteria:**
  - Unique URL per classroom (e.g., /classroom/[id]/checkin)
  - Interface only accessible when teacher is logged in
  - Full-screen, student-friendly interface
  - Shows live queue of students currently out

**US-7: View Live Queue**
- As a teacher, I want to see which students are currently out of the classroom and for how long so that I can monitor bathroom breaks.
- **Acceptance Criteria:**
  - Real-time list of checked-out students
  - Shows name, checkout time, duration
  - Duration updates live (e.g., "5 min ago" → "6 min ago")
  - Visual indicator (color change) for students out >15 minutes
  - Queue updates immediately when students check in/out

**US-8: Manually Check Student In/Out**
- As a teacher, I want to manually check a student in or out if they forget to scan their card so that records stay accurate.
- **Acceptance Criteria:**
  - Teacher dashboard has manual override option
  - Search/select student from roster
  - Toggle check-in/out status
  - Logs show manual override with teacher notation

**US-9: View Check-In/Out History**
- As a teacher, I want to view a log of all check-ins and check-outs so that I can review patterns or resolve disputes.
- **Acceptance Criteria:**
  - Filterable by date range
  - Shows student name, action (in/out), timestamp
  - Option to export as CSV
  - Sortable by student or time

### Student - Daily Use

**US-10: Check Out of Classroom**
- As a student, I want to scan my QR code ID card using the webcam so that my teacher knows I've left the room.
- **Acceptance Criteria:**
  - Student holds QR code card up to Chromebook camera
  - System automatically scans and recognizes student
  - Displays student name: "Welcome [First] [Last]"
  - Shows "Check Out" button
  - Confirmation message, then returns to camera view
  - Student appears in live queue immediately
  - Fallback: Manual card ID entry if camera fails

**US-11: Check Back Into Classroom**
- As a student, I want to scan my QR code ID card using the webcam so that my teacher knows I've returned.
- **Acceptance Criteria:**
  - Student holds QR code card up to Chromebook camera
  - System automatically scans and recognizes student
  - Displays student name: "Welcome [First] [Last]"
  - Shows "Check In" button
  - Confirmation message, then returns to camera view
  - Student removed from live queue immediately
  - Fallback: Manual card ID entry if camera fails

**US-12: View Current Status**
- As a student, I want to see whether I'm currently checked in or out after scanning my card so that I know if I need to check back in.
- **Acceptance Criteria:**
  - After QR code scan, shows current status: "You are: IN" or "You are: OUT"
  - Clear call-to-action button based on status
  - Prevents double check-out (if already out, shows "Check In" only)
  - Auto-returns to camera view after 10 seconds of inactivity

---

## Data Models (Prisma Schema)

### User (Teacher)
```prisma
model User {
  id            String      @id @default(cuid())
  email         String      @unique
  name          String?
  passwordHash  String
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  classrooms    Classroom[]
}
```

### Classroom
```prisma
model Classroom {
  id          String      @id @default(cuid())
  name        String
  teacherId   String
  teacher     User        @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  isActive    Boolean     @default(true)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  students    ClassroomStudent[]
  checkIns    CheckIn[]
}
```

### Student
```prisma
model Student {
  id          String      @id @default(cuid())
  firstName   String
  lastName    String
  cardId      String      @unique @default(cuid()) // UUID for QR code card
  classrooms  ClassroomStudent[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  checkIns    CheckIn[]
}

model ClassroomStudent {
  id          String      @id @default(cuid())
  studentId   String
  student     Student     @relation(fields: [studentId], references: [id], onDelete: Cascade)
  classroomId String
  classroom   Classroom   @relation(fields: [classroomId], references: [id], onDelete: Cascade)
  createdAt   DateTime    @default(now())
  
  @@unique([studentId, classroomId]) // Prevent duplicates in same classroom
}
```

### CheckIn
```prisma
model CheckIn {
  id          String      @id @default(cuid())
  studentId   String
  student     Student     @relation(fields: [studentId], references: [id], onDelete: Cascade)
  classroomId String
  classroom   Classroom   @relation(fields: [classroomId], references: [id], onDelete: Cascade)
  checkOutAt  DateTime    @default(now())
  checkInAt   DateTime?   // Null if still checked out
  manualOverride Boolean  @default(false) // True if teacher manually adjusted
  createdAt   DateTime    @default(now())
  
  @@index([classroomId, checkInAt]) // For querying active check-outs
}
```

---

## Key Pages & Routes

### Authentication
- `/login` - Teacher login page
- `/register` - Teacher registration
- `/forgot-password` - Password reset request
- `/api/auth/[...nextauth]` - NextAuth.js API routes

### Teacher Dashboard
- `/dashboard` - Overview of all classrooms
- `/dashboard/classroom/[id]` - Individual classroom management
- `/dashboard/classroom/[id]/students` - Student roster management
- `/dashboard/classroom/[id]/history` - Check-in/out logs

### Student Check-In Interface
- `/classroom/[id]/checkin` - Full-screen student kiosk interface
- Protected: Requires active teacher session

### API Routes
- `/api/classrooms` - CRUD for classrooms
- `/api/students` - CRUD for students
- `/api/checkin` - Handle check-in/out actions
- `/api/queue/[classroomId]` - Get current queue (for live updates)

---

## Security Considerations

1. **Authentication**
   - Use NextAuth.js with credentials provider
   - Bcrypt for password hashing
   - CSRF protection enabled by default
   - HttpOnly cookies for session tokens

2. **Authorization**
   - Teachers can only access their own classrooms
   - Student-facing interface requires active teacher session
   - API routes verify ownership before mutations

3. **Data Privacy**
   - Student data (names, IDs) only visible to their teachers
   - No public student endpoints
   - Session tokens expire after 12 hours

4. **Input Validation**
   - Sanitize all user inputs (student IDs, names)
   - Validate file uploads (CSV parsing)
   - Rate limiting on check-in/out API (prevent spam)

---

## Non-Functional Requirements

### Performance
- Check-in/out action completes in <500ms
- Queue updates in real-time (use polling or WebSockets)
- Support 30+ students per classroom
- Handle 5+ simultaneous check-ins/outs

### Usability
- Mobile-responsive (though primarily tablet/Chromebook)
- Large, touch-friendly buttons for student interface
- Accessible (WCAG 2.1 AA compliance)
- Simple, intuitive UI (students need minimal instruction)

### Reliability
- Graceful handling of network issues
- Local storage fallback for check-in/out if server unreachable
- Clear error messages for users
- Data backup recommendations

---

## Future Enhancements (Post-MVP)

- **Student profiles**: Photos, grade levels, additional info
- **Notifications**: Alert teacher if student out >X minutes (email/SMS)
- **Reports**: Weekly/monthly summaries, patterns analysis
- **Multi-school support**: School admin role, district-level views
- **Mobile app**: Native iOS/Android apps for teachers
- **SIS Integration**: Sync with school Student Information System for automated roster management
- **Offline mode**: Full offline support with sync when online
- **RFID/NFC support**: Alternative scanning methods for schools with existing badge systems
- **Configurable thresholds**: Let teachers set custom "extended absence" times per classroom

---

## Success Metrics

- Teachers can set up a classroom in <5 minutes
- Students can check in/out in <10 seconds
- 90%+ teacher satisfaction with ease of use
- Zero unauthorized access to student data
- System uptime of 99%+ during school hours

---

## Development Phases

### Phase 1: Foundation (Week 1)
- Set up Next.js project with TypeScript
- Configure Prisma with initial schema
- Implement NextAuth.js authentication
- Create basic teacher registration/login

### Phase 2: Core Features (Week 2)
- Classroom CRUD operations
- Student management (manual add, CSV upload)
- Basic check-in/out API
- Teacher dashboard UI

### Phase 3: Student Interface (Week 3)
- Student-facing check-in kiosk
- Live queue display
- Real-time updates (polling or WebSockets)
- Session management (12-hour expiry)

### Phase 4: Polish & Deploy (Week 4)
- Check-in/out history view
- Manual override functionality
- Error handling and validation
- Testing and bug fixes
- Deployment to Vercel
- Documentation

---

## Getting Started with Claude Code

To build this project with Claude Code:

1. **Initialize the project:**
   ```bash
   npx create-next-app@latest classroom-checkin --typescript --tailwind --app
   cd classroom-checkin
   ```

2. **Install dependencies:**
   ```bash
   npm install prisma @prisma/client next-auth@beta bcryptjs
   npm install qrcode html5-qrcode jspdf papaparse
   npm install -D @types/bcryptjs @types/qrcode @types/papaparse
   ```

3. **Set up Prisma:**
   ```bash
   npx prisma init
   ```

4. **Reference this spec:**
   - Use the data models to create `prisma/schema.prisma`
   - Follow the user stories for feature implementation
   - Use the routes structure for navigation

5. **Environment variables (.env.local):**
   ```
   DATABASE_URL="postgresql://..."
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   ```

---

## Clarifications & Decisions

**Resolved Questions:**

1. **Student ID format**: ✅ UUIDs auto-generated by the application (no external student IDs needed)
2. **CSV format**: ✅ Two columns: "First Name" and "Last Name"
3. **Extended absence threshold**: ✅ 15 minutes is the threshold for visual indicator
4. **Multi-classroom students**: ✅ Students can belong to multiple classrooms (many-to-many relationship)
5. **Card scanner**: ✅ QR code scanning using Chromebook webcam with manual entry fallback

**Technical Implementation Notes:**

- **QR Code Library**: Use `qrcode` npm package for generation, `html5-qrcode` or `@zxing/browser` for webcam scanning
- **Camera Permissions**: Will need to request browser camera permissions on first use
- **QR Code Content**: Store the student's `cardId` (UUID) in the QR code
- **Printing**: Generate PDF with QR codes using `jsPDF` or similar library
- **Fallback**: Provide manual UUID entry field if camera isn't working or student forgets card

---

## Conclusion

This MVP provides a solid foundation for a classroom check-in/out system that can be expanded based on teacher feedback. The Next.js + Prisma + NextAuth stack is modern, maintainable, and demonstrates valuable skills for your portfolio.

The focus is on simplicity, security, and usability—core principles that make the application practical for real classroom use while showcasing your full-stack development abilities.
