-- AlterTable
ALTER TABLE "Product" ADD COLUMN "sku" TEXT;
UPDATE "Product" SET "sku" = '000000';
ALTER TABLE "Product" ALTER COLUMN "sku" SET NOT NULL;
ALTER TABLE "Product" ADD CONSTRAINT "Product_sku_key" UNIQUE ("sku");
