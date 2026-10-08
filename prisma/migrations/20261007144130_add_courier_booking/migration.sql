-- CreateTable
CREATE TABLE "CourierBooking" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'steadfast',
    "consignmentId" TEXT NOT NULL,
    "trackingCode" TEXT,
    "trackingLink" TEXT,
    "courierStatus" TEXT NOT NULL DEFAULT 'in_review',
    "lastSyncedAt" TIMESTAMP(3),
    "lastEventKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourierBooking_orderId_key" ON "CourierBooking"("orderId");

-- CreateIndex
CREATE INDEX "CourierBooking_provider_courierStatus_idx" ON "CourierBooking"("provider", "courierStatus");

-- CreateIndex
CREATE UNIQUE INDEX "CourierBooking_provider_consignmentId_key" ON "CourierBooking"("provider", "consignmentId");

-- AddForeignKey
ALTER TABLE "CourierBooking" ADD CONSTRAINT "CourierBooking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
