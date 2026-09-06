-- Dynamic variant options: replace flattened size/color columns with a
-- positional JSONB array on ProductVariant, and persist option names in a
-- new ProductOption table. Existing size/color data is preserved.

-- CreateTable
CREATE TABLE "ProductOption" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductOption_productId_idx" ON "ProductOption"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOption_productId_position_key" ON "ProductOption"("productId", "position");

-- AddForeignKey
ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN "options" JSONB NOT NULL DEFAULT '[]';

-- Backfill: copy size/color values into the options array (empty strings and
-- NULLs are dropped; the WHERE clause filters JSON null array elements).
UPDATE "ProductVariant"
SET "options" = COALESCE((
    SELECT jsonb_agg(val)
    FROM jsonb_array_elements(jsonb_build_array(NULLIF("size", ''), NULLIF("color", ''))) AS arr(val)
    WHERE val <> 'null'::jsonb
), '[]'::jsonb);

-- Backfill option names. Old option names were never persisted; products with
-- variants used the hardcoded Size/Color convention.
INSERT INTO "ProductOption" ("id", "productId", "name", "position")
SELECT md5(random()::text || clock_timestamp()::text || p."id")::uuid, p."id", 'Size', 0
FROM "Product" p
WHERE EXISTS (
    SELECT 1 FROM "ProductVariant" v
    WHERE v."productId" = p."id" AND jsonb_array_length(v."options") >= 1
);

INSERT INTO "ProductOption" ("id", "productId", "name", "position")
SELECT md5(random()::text || clock_timestamp()::text || p."id")::uuid, p."id", 'Color', 1
FROM "Product" p
WHERE EXISTS (
    SELECT 1 FROM "ProductVariant" v
    WHERE v."productId" = p."id" AND jsonb_array_length(v."options") >= 2
);

-- Drop the old flattened columns
ALTER TABLE "ProductVariant" DROP COLUMN "size",
DROP COLUMN "color";
