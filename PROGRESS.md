# Development Progress

Last Updated: 2026-01-14

## Completed

### Phase 1: Foundation
- [x] Project setup (Next.js 14, TypeScript, TailwindCSS)
- [x] Database schema with Prisma (User, Classroom, Student, ClassroomStudent, CheckIn)
- [x] Initial database migration (`20260111191145_init`)
- [x] Field-level encryption for PII data (AES-256-GCM) - `src/lib/encryption.ts`
- [x] NextAuth.js configuration with credentials provider (12-hour sessions)
- [x] Teacher registration page (`/register`)
- [x] Teacher login page (`/login`)
- [x] Registration API route (`/api/auth/register`)
- [x] Protected dashboard page (`/dashboard`)
- [x] Password hashing with bcrypt (12 rounds)
- [x] TypeScript types for Prisma models and API responses

### Phase 2: Core Features
- [x] Classroom CRUD operations (API routes + UI components)
- [x] Classroom list with create/edit/delete modals
- [x] Dashboard with classroom management
- [x] Classroom detail page (`/dashboard/classroom/[id]`)
- [x] Student management (add, edit, remove from classroom)
- [x] CSV bulk upload for students
- [x] Student names encrypted at rest (FERPA compliance)
- [x] QR code generation for student cards
  - QR code utility (`src/lib/qrcode.ts`)
  - QR Cards modal with preview and selection
  - PDF generation with 10 cards per page (business card format)

### Phase 3: Check-In System
- [x] QR code scanner component (`src/components/QRScanner.tsx`)
  - Webcam-based QR code scanning using `html5-qrcode`
  - Manual card ID entry fallback
  - Camera permission handling
  - React Strict Mode compatible
- [x] Check-in/out API routes
  - `/api/classroom/[id]/kiosk` - Get classroom info and queue
  - `/api/classroom/[id]/lookup` - Look up student by card ID
  - `/api/classroom/[id]/checkin` - Handle check-in/out actions
  - `/api/classroom/[id]/queue` - Get current queue (polling)
  - `/api/classroom/[id]/history` - Get check-in/out history
- [x] Student kiosk interface (`/classroom/[id]/checkin`)
  - Full-screen student-facing interface
  - QR scanner with status display
  - Check-in/out confirmation flow
  - Auto-return to scanner after 3 seconds
- [x] Live queue component
  - Real-time display of checked-out students
  - Duration tracking with extended absence indicator (>15 min)
  - Auto-polling every 5 seconds
- [x] Manual check-in/out override (teacher dashboard)
  - Status column showing In/Out for each student
  - Check In/Check Out buttons per student
  - Records marked as manual override

### Phase 4: UI Polish
- [x] Link to kiosk from classroom page ("Open Kiosk" button)
- [x] Check-in/out history view (`/dashboard/classroom/[id]/history`)
  - Filterable by date range
  - Shows student, date, out time, in time, duration
  - Indicates manual vs scan check-ins
  - Pagination with "Load More"
- [x] Global cursor pointer CSS for all interactive elements
- [x] Account-level PIN for kiosk protection
  - PIN utilities (`src/lib/pin.ts`) - validate, hash, verify
  - PIN API routes (`/api/user/pin/*`) - set, delete, verify, status
  - PinEntryModal - touch-friendly numeric keypad (dark theme)
  - PinSetupModal - enter/confirm flow with remove option
  - Settings gear icon in dashboard header
- [x] Kiosk lock/unlock and back button
  - Back button (left) - returns to dashboard (PIN protected if set)
  - Lock button (right) - enters locked state
  - Full-screen lock overlay with unlock button
  - PIN entry required if PIN is set, otherwise immediate unlock/exit

### Additional Features
- Wait List for bathrooms specifically
- Sorting and filtering students
- Buttons still don't all have cursor pointer
- Make "check in" and "check out" language more natural


## In Progress

(None)

## Todo

(MVP Complete!)

## Known Issues
- None currently

## Notes
- Using Prisma 7 with driver adapter pattern (`@prisma/adapter-better-sqlite3`)
- SQLite for development, can switch to PostgreSQL for production
- User names encrypted at rest, decrypted on session load
- Normalized database design with ClassroomStudent join table (industry standard)

## File Structure Created
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts
│   │   │   └── register/route.ts
│   │   ├── classroom/[id]/
│   │   │   ├── checkin/route.ts       # POST check-in/out action
│   │   │   ├── history/route.ts       # GET check-in/out history
│   │   │   ├── kiosk/route.ts         # GET kiosk initialization
│   │   │   ├── lookup/route.ts        # GET student by cardId
│   │   │   └── queue/route.ts         # GET current queue
│   │   ├── classrooms/
│   │   │   ├── route.ts               # GET (list), POST (create)
│   │   │   └── [id]/
│   │   │       ├── route.ts           # GET, PATCH, DELETE classroom
│   │   │       └── students/
│   │   │           ├── route.ts       # GET (list), POST (add student)
│   │   │           ├── [studentId]/route.ts # GET, PATCH, DELETE student
│   │   │           └── bulk/route.ts  # POST (CSV bulk upload)
│   │   └── user/pin/
│   │       ├── route.ts               # POST (set), DELETE (remove) PIN
│   │       ├── verify/route.ts        # POST verify PIN
│   │       └── status/route.ts        # GET PIN status
│   ├── classroom/[id]/
│   │   └── checkin/page.tsx           # Student kiosk interface
│   └── dashboard/
│       ├── page.tsx                   # Classroom list dashboard
│       └── classroom/[id]/
│           ├── page.tsx               # Classroom detail with students
│           └── history/page.tsx       # Check-in/out history
├── components/
│   ├── ClassroomCard.tsx          # Classroom card with actions
│   ├── ClassroomList.tsx          # Classroom grid with CRUD
│   ├── ClassroomModal.tsx         # Create/edit classroom modal
│   ├── CSVUploadModal.tsx         # CSV bulk upload modal
│   ├── DashboardHeader.tsx        # Dashboard header with settings
│   ├── HistoryList.tsx            # Check-in/out history table
│   ├── PinEntryModal.tsx          # Touch-friendly PIN entry keypad
│   ├── PinSetupModal.tsx          # PIN setup with confirm flow
│   ├── QRCardsModal.tsx           # QR code card generation and PDF export
│   ├── QRScanner.tsx              # Webcam QR code scanner
│   ├── StudentList.tsx            # Student table with CRUD + status
│   └── StudentModal.tsx           # Add/edit student modal
├── lib/
│   ├── auth.ts          # NextAuth configuration
│   ├── encryption.ts    # AES-256-GCM encryption
│   ├── pin.ts           # PIN validation, hashing, verification
│   ├── prisma.ts        # Prisma client singleton
│   ├── qrcode.ts        # QR code generation utilities
│   └── utils.ts         # Password hashing, helpers
├── types/
│   ├── index.ts         # Shared TypeScript types
│   └── next-auth.d.ts   # NextAuth type extensions
└── hooks/               # (ready for custom hooks)
```
