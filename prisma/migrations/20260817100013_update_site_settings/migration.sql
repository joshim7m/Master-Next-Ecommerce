-- AlterTable
ALTER TABLE "OrderDetails" ADD COLUMN     "deviceHash" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "tags" TEXT;

-- AlterTable
ALTER TABLE "SiteSetting" ADD COLUMN     "aboutCompany" TEXT,
ADD COLUMN     "aboutCompany_bn" TEXT;

-- CreateTable
CREATE TABLE "BlockedDevice" (
    "id" TEXT NOT NULL,
    "deviceHash" TEXT NOT NULL,
    "reason" TEXT,
    "orderNo" TEXT,
    "blockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlockedDevice_deviceHash_key" ON "BlockedDevice"("deviceHash");

-- CreateIndex
CREATE INDEX "BlockedDevice_deviceHash_idx" ON "BlockedDevice"("deviceHash");
