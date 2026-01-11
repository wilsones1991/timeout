# Classroom Check-In/Out System - Claude Code Guidelines

## Project Overview
A Next.js web application for teachers to manage student check-ins/outs across multiple classrooms. Students scan QR code ID cards via webcam to check in/out. See `SPEC.md` for complete requirements and user stories.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes, Prisma ORM, PostgreSQL/SQLite
- **Auth**: NextAuth.js v5 (12-hour sessions)
- **QR Codes**: `qrcode` (generation), `html5-qrcode` (scanning), `jspdf` (printing)

## Bash Commands

### Development
- `npm run dev`: Start development server (http://localhost:3000)
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint
- `npm run typecheck`: Run TypeScript type checking (alias: `npx tsc --noEmit`)

### Database (Prisma)
- `npx prisma generate`: Generate Prisma client after schema changes
- `npx prisma migrate dev --name <name>`: Create and apply a new migration
- `npx prisma migrate reset`: Reset database (WARNING: deletes all data)
- `npx prisma studio`: Open Prisma Studio GUI (http://localhost:5555)
- `npx prisma db push`: Push schema changes without creating migration (dev only)
- `npx prisma db seed`: Run seed script to populate test data

### Testing
- `npm test`: Run test suite (when implemented)
- `npm run test:watch`: Run tests in watch mode

## Code Style & Conventions

### General
- Use TypeScript for all new files
- Use ES modules (`import/export`), not CommonJS (`require`)
- Destructure imports when possible: `import { useState } from 'react'`
- Use functional components with hooks, not class components
- Prefer `const` over `let`, avoid `var`

### Next.js Specific
- Use App Router (not Pages Router)
- Server Components by default, add `'use client'` only when needed (state, effects, browser APIs)
- Use Server Actions for mutations when appropriate
- Import from `@/*` alias: `import { prisma } from '@/lib/prisma'`

### File Naming
- Components: PascalCase (`StudentQueue.tsx`, `QRScanner.tsx`)
- Utilities/libs: camelCase (`auth.ts`, `utils.ts`)
- API routes: lowercase with hyphens (`check-in/route.ts`)
- Types: PascalCase interfaces (`Student`, `CheckInRecord`)

### React Best Practices
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use proper TypeScript types for props (avoid `any`)
- Handle loading and error states explicitly
- Memoize expensive calculations with `useMemo`

### Database
- Always use Prisma Client from `@/lib/prisma` (singleton instance)
- Never commit `.env` files (use `.env.local` for local dev)
- Write migrations with descriptive names: `add_student_card_id`
- Use transactions for multi-step operations

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Teacher dashboard pages
│   ├── classroom/[id]/    # Classroom-specific pages
│   └── layout.tsx         # Root layout
├── components/
│   ├── ui/                # Reusable UI components (buttons, inputs, etc.)
│   ├── QRScanner.tsx      # Webcam QR code scanner
│   ├── StudentQueue.tsx   # Live queue display
│   └── ...
├── lib/
│   ├── prisma.ts          # Prisma client singleton
│   ├── auth.ts            # NextAuth configuration
│   └── utils.ts           # Shared utilities
├── types/
│   └── index.ts           # Shared TypeScript types
└── hooks/                 # Custom React hooks
```

## Key Files & Utilities

### Database Client (`src/lib/prisma.ts`)
Singleton Prisma client instance. Always import from here:
```typescript
import { prisma } from '@/lib/prisma'
```

### Auth Config (`src/lib/auth.ts`)
NextAuth.js configuration with:
- Credentials provider for teacher login
- 12-hour session duration
- Password hashing with bcrypt

### QR Code Utilities
- Generation: Use `qrcode` library for creating QR codes from student `cardId`
- Scanning: Use `html5-qrcode` for webcam scanning
- Printing: Use `jspdf` to generate printable PDF cards

## Workflow & Testing

### Before Committing
1. Run typecheck: `npm run typecheck`
2. Run linter: `npm run lint`
3. Test affected features manually
4. Update `PROGRESS.md` with completed work

### Testing Strategy
- Test authentication flow (login, session expiry)
- Test QR code generation and scanning with real QR codes
- Test check-in/out flow end-to-end
- Verify live queue updates in real-time
- Test CSV upload with sample data
- Check mobile/tablet responsiveness (primary use case)

### Database Changes
1. Modify `prisma/schema.prisma`
2. Run `npx prisma generate` to update client
3. Run `npx prisma migrate dev --name descriptive_name` to create migration
4. Test migration with seed data

### Running Tests Locally
- Prefer running single tests during development for speed
- Run full test suite before pushing to main branch
- Use Prisma Studio to inspect database state while debugging

## Development Environment

### Prerequisites
- Node.js 18+ (check with `node --version`)
- npm or pnpm
- PostgreSQL (production) or SQLite (local dev)

### Environment Variables (`.env.local`)
```
DATABASE_URL="postgresql://user:password@localhost:5432/classroom_checkin"
# OR for SQLite: "file:./dev.db"

NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

### First-Time Setup
1. Clone repo and install: `npm install`
2. Copy `.env.example` to `.env.local` and configure
3. Run migrations: `npx prisma migrate dev`
4. Seed database: `npx prisma db seed`
5. Start dev server: `npm run dev`

## Known Issues & Gotchas

### Camera Permissions
- Browser must be served over HTTPS or localhost for webcam access
- Chrome on Chromebook: camera permission prompt appears on first use
- If camera fails, fallback to manual UUID entry

### Session Management
- Sessions expire after 12 hours (school day coverage)
- No auto-lock during the day by design (student flow requirement)
- Teacher can manually end session via dashboard

### QR Code Scanning
- QR codes must be held steady within camera frame
- Lighting conditions affect scan speed (ensure good classroom lighting)
- QR scanner component should show clear visual feedback

### Prisma
- Always run `npx prisma generate` after schema changes
- In development, prefer `prisma migrate dev` over `prisma db push`
- Prisma Client must be singleton to avoid connection pool exhaustion

### Next.js App Router
- Server Components can't use hooks or browser APIs
- Mark client components with `'use client'` directive
- API routes return `Response` objects, not raw data

## Repository Etiquette

### Branching
- `main`: Production-ready code
- `develop`: Integration branch (if using)
- Feature branches: `feature/qr-scanner`, `feature/csv-upload`
- Bug fixes: `fix/session-expiry`, `fix/queue-update`

### Commits
- Use clear, descriptive commit messages
- Format: `feat: add QR code scanner component` or `fix: resolve session timeout issue`
- Commit working, tested code (not broken WIP)

### Pull Requests
- Keep PRs focused on single feature/fix
- Reference user stories from SPEC.md (e.g., "Implements US-3")
- Include screenshots for UI changes
- Ensure CI passes (linting, type checking)

## Progress Tracking

### PROGRESS.md File
Keep a `PROGRESS.md` file in the project root to track development status. Update it after completing each task or feature. Use this format:

```markdown
# Development Progress

Last Updated: [Date]

## ✅ Completed

### Phase 1: Foundation
- [x] Project setup (Next.js, TypeScript, Prisma)
- [x] Database schema and migrations
- [x] NextAuth configuration (12-hour sessions)
- [x] Teacher registration and login pages

### Phase 2: Core Features
- [x] Classroom CRUD operations
- [x] Student management (manual add)
- [x] CSV bulk upload for students

## 🚧 In Progress

### Phase 3: Check-In System
- [ ] QR code scanner component (webcam)
- [ ] Check-in/out API routes
- [ ] Live queue component

## 📋 Todo

### Phase 3: Check-In System (continued)
- [ ] Real-time queue updates
- [ ] Manual check-in/out override

### Phase 4: UI Polish
- [ ] Teacher dashboard layout
- [ ] Student kiosk interface
- [ ] Check-in/out history view
- [ ] QR code card printing (PDF generation)

## 🐛 Known Issues
- None currently

## 📝 Notes
- Camera permission testing required on actual Chromebook
- Consider rate limiting for check-in API
```

### When to Update PROGRESS.md
- ✅ After completing a user story from SPEC.md
- ✅ When starting work on a new feature (move to "In Progress")
- ✅ When discovering bugs or issues (add to "Known Issues")
- ✅ After major refactoring or architecture changes
- ✅ At the end of each development session

### Progress Tracking Tips
- Keep it concise but specific
- Link completed items to user stories (US-1, US-2, etc.)
- Document blockers or dependencies
- Note any deviations from original spec
- Track performance or security concerns

## Additional Resources

- **Full Spec**: See `SPEC.md` for complete user stories and requirements
- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js Docs**: https://nextjs.org/docs
- **NextAuth.js**: https://authjs.dev
- **html5-qrcode**: https://github.com/mebjas/html5-qrcode

## Questions?

If something is unclear or you need to make architectural decisions:
1. Check `SPEC.md` for requirements and user stories
2. Reference this file for conventions and workflow
3. Ask for clarification before implementing if uncertain
4. Document decisions and rationale in code comments
