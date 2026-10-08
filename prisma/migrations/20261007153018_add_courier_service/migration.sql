-- CreateTable
CREATE TABLE "CourierService" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "apiKey" TEXT,
    "secretKey" TEXT,
    "clientId" TEXT,
    "clientSecret" TEXT,
    "baseUrl" TEXT,
    "webhookToken" TEXT,
    "trackingUrl" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourierService_provider_key" ON "CourierService"("provider");

-- CreateIndex
CREATE INDEX "CourierService_enabled_idx" ON "CourierService"("enabled");
