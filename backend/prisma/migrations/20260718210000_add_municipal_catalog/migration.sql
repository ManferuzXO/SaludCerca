CREATE TYPE "LocationVerification" AS ENUM ('VERIFIED', 'PENDING');

CREATE TABLE "CatalogoCentroMunicipal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "macrodistrict" TEXT NOT NULL,
    "district" INTEGER NOT NULL,
    "network" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "address" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "locationStatus" "LocationVerification" NOT NULL DEFAULT 'PENDING',
    "source" TEXT NOT NULL,
    "sourceUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CatalogoCentroMunicipal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CatalogoCentroMunicipal_name_key" ON "CatalogoCentroMunicipal"("name");
CREATE INDEX "CatalogoCentroMunicipal_macrodistrict_district_idx" ON "CatalogoCentroMunicipal"("macrodistrict", "district");
CREATE INDEX "CatalogoCentroMunicipal_locationStatus_idx" ON "CatalogoCentroMunicipal"("locationStatus");
