-- CreateTable
CREATE TABLE "CompletedCustomer" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerName" TEXT,
    "phoneNumber" TEXT,
    "shippingAddress" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompletedCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompletedCustomer_orderId_key" ON "CompletedCustomer"("orderId");

-- CreateIndex
CREATE INDEX "CompletedCustomer_phoneNumber_idx" ON "CompletedCustomer"("phoneNumber");

-- CreateIndex
CREATE INDEX "CompletedCustomer_orderDate_idx" ON "CompletedCustomer"("orderDate");
