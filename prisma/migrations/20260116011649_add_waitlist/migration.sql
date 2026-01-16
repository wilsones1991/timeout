-- AlterTable
ALTER TABLE "Destination" ADD COLUMN "capacity" INTEGER;

-- CreateTable
CREATE TABLE "WaitListEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    CONSTRAINT "WaitListEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WaitListEntry_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WaitListEntry_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WaitListEntry_classroomId_destinationId_status_idx" ON "WaitListEntry"("classroomId", "destinationId", "status");

-- CreateIndex
CREATE INDEX "WaitListEntry_studentId_classroomId_idx" ON "WaitListEntry"("studentId", "classroomId");
