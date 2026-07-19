CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "ciHash" TEXT NOT NULL,
    "ciLast4" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "insuranceProvider" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Patient_ciHash_key" ON "Patient"("ciHash");
CREATE INDEX "Patient_ciLast4_idx" ON "Patient"("ciLast4");

ALTER TABLE "Appointment" ADD COLUMN "patientId" TEXT;
ALTER TABLE "Appointment" ALTER COLUMN "userId" DROP NOT NULL;
CREATE INDEX "Appointment_patientId_createdAt_idx" ON "Appointment"("patientId", "createdAt");
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
