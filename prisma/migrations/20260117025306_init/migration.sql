-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "pinHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classroom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomStudent" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "checkOutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkInAt" TIMESTAMP(3),
    "destination" TEXT,
    "manualOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Destination" (
    "id" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitListEntry" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "WaitListEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Student_cardId_key" ON "Student"("cardId");

-- CreateIndex
CREATE INDEX "ClassroomStudent_classroomId_idx" ON "ClassroomStudent"("classroomId");

-- CreateIndex
CREATE INDEX "ClassroomStudent_studentId_idx" ON "ClassroomStudent"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomStudent_studentId_classroomId_key" ON "ClassroomStudent"("studentId", "classroomId");

-- CreateIndex
CREATE INDEX "CheckIn_classroomId_checkInAt_idx" ON "CheckIn"("classroomId", "checkInAt");

-- CreateIndex
CREATE INDEX "CheckIn_studentId_idx" ON "CheckIn"("studentId");

-- CreateIndex
CREATE INDEX "Destination_classroomId_idx" ON "Destination"("classroomId");

-- CreateIndex
CREATE UNIQUE INDEX "Destination_classroomId_name_key" ON "Destination"("classroomId", "name");

-- CreateIndex
CREATE INDEX "WaitListEntry_classroomId_destinationId_status_idx" ON "WaitListEntry"("classroomId", "destinationId", "status");

-- CreateIndex
CREATE INDEX "WaitListEntry_studentId_classroomId_idx" ON "WaitListEntry"("studentId", "classroomId");

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomStudent" ADD CONSTRAINT "ClassroomStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomStudent" ADD CONSTRAINT "ClassroomStudent_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Destination" ADD CONSTRAINT "Destination_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitListEntry" ADD CONSTRAINT "WaitListEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitListEntry" ADD CONSTRAINT "WaitListEntry_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitListEntry" ADD CONSTRAINT "WaitListEntry_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
