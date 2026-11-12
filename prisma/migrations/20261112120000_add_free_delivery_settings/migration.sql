-- Free-delivery promo settings on the SiteSetting singleton: an on/off switch
-- plus the minimum number of distinct products that qualifies an order.
ALTER TABLE "SiteSetting" ADD COLUMN "freeDeliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "freeDeliveryMinProducts" INTEGER NOT NULL DEFAULT 2;
