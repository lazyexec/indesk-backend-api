/*
  Warnings:

  - A unique constraint covering the columns `[ownerId]` on the table `Clinic` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "ClinicRole" ADD VALUE 'superAdmin';

-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "logo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_ownerId_key" ON "Clinic"("ownerId");
