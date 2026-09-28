-- CreateTable
CREATE TABLE "ProductUpsell" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "upsellId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductUpsell_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductUpsell_upsellId_idx" ON "ProductUpsell"("upsellId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductUpsell_productId_upsellId_key" ON "ProductUpsell"("productId", "upsellId");

-- AddForeignKey
ALTER TABLE "ProductUpsell" ADD CONSTRAINT "ProductUpsell_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductUpsell" ADD CONSTRAINT "ProductUpsell_upsellId_fkey" FOREIGN KEY ("upsellId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
