-- AlterTable
ALTER TABLE "Student" ADD COLUMN "googleUserIdHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Student_googleUserIdHash_key" ON "Student"("googleUserIdHash");
