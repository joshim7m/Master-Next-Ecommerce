/*
  Warnings:

  - You are about to drop the column `paymentStatus` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `billingAddress` on the `OrderDetails` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `OrderDetails` table. All the data in the column will be lost.
  - You are about to drop the column `compareAtPrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `inventoryQuantity` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `inventoryQuantity` on the `ProductVariant` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `ProductVariant` table. All the data in the column will be lost.
  - You are about to drop the column `billingAddress` on the `UserDetails` table. All the data in the column will be lost.
  - Added the required column `quantity` to the `ProductVariant` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "OrderDetails" DROP CONSTRAINT "OrderDetails_userId_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "paymentStatus";

-- AlterTable
ALTER TABLE "OrderDetails" DROP COLUMN "billingAddress",
DROP COLUMN "userId",
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "ipAddress" TEXT;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "compareAtPrice",
DROP COLUMN "inventoryQuantity",
ADD COLUMN     "quantity" INTEGER;

-- AlterTable
ALTER TABLE "ProductVariant" DROP COLUMN "inventoryQuantity",
DROP COLUMN "price",
ADD COLUMN     "quantity" INTEGER NOT NULL,
ADD COLUMN     "unite_price" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "UserDetails" DROP COLUMN "billingAddress";

-- CreateTable
CREATE TABLE "BlogCategory" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "image" TEXT,
    "authorName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "bannerImage" TEXT,
    "categoryId" TEXT NOT NULL,
    "tags" TEXT,
    "metaDescription" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Advertisement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT,
    "text" TEXT,
    "price" DECIMAL(65,30),
    "productLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advertisement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPostAdvertisement" (
    "blogPostId" TEXT NOT NULL,
    "advertisementId" TEXT NOT NULL,

    CONSTRAINT "BlogPostAdvertisement_pkey" PRIMARY KEY ("blogPostId","advertisementId")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlogCategory_slug_key" ON "BlogCategory"("slug");

-- CreateIndex
CREATE INDEX "BlogCategory_status_idx" ON "BlogCategory"("status");

-- CreateIndex
CREATE INDEX "BlogCategory_title_idx" ON "BlogCategory"("title");

-- CreateIndex
CREATE INDEX "BlogCategory_slug_idx" ON "BlogCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_categoryId_createdAt_idx" ON "BlogPost"("categoryId", "createdAt");

-- CreateIndex
CREATE INDEX "BlogPost_status_createdAt_idx" ON "BlogPost"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BlogPost_title_idx" ON "BlogPost"("title");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Category_name_idx" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "HeroSlider_order_idx" ON "HeroSlider"("order");

-- CreateIndex
CREATE INDEX "HeroSlider_isActive_idx" ON "HeroSlider"("isActive");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_orderNo_idx" ON "Order"("orderNo");

-- CreateIndex
CREATE INDEX "Order_orderStatus_idx" ON "Order"("orderStatus");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productTitle_idx" ON "OrderItem"("productTitle");

-- CreateIndex
CREATE INDEX "Product_status_createdAt_idx" ON "Product"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Product_title_idx" ON "Product"("title");

-- CreateIndex
CREATE INDEX "Product_slug_idx" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE INDEX "ProductVariant_imageId_idx" ON "ProductVariant"("imageId");

-- CreateIndex
CREATE INDEX "SocialLink_order_idx" ON "SocialLink"("order");

-- CreateIndex
CREATE INDEX "SocialLink_isActive_idx" ON "SocialLink"("isActive");

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BlogCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostAdvertisement" ADD CONSTRAINT "BlogPostAdvertisement_blogPostId_fkey" FOREIGN KEY ("blogPostId") REFERENCES "BlogPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostAdvertisement" ADD CONSTRAINT "BlogPostAdvertisement_advertisementId_fkey" FOREIGN KEY ("advertisementId") REFERENCES "Advertisement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
