-- AlterTable
ALTER TABLE "CheckIn" ADD COLUMN "destination" TEXT;

-- CreateTable
CREATE TABLE "Destination" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classroomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Destination_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Destination_classroomId_idx" ON "Destination"("classroomId");

-- CreateIndex
CREATE UNIQUE INDEX "Destination_classroomId_name_key" ON "Destination"("classroomId", "name");
