-- Rename the 'accepted' order status value to 'in_review' (displayed as "In Review").
-- The sidebar filter, status dropdowns and colour maps now use 'in_review';
-- this keeps existing rows queryable under the new value.
UPDATE "Order" SET "orderStatus" = 'in_review' WHERE "orderStatus" = 'accepted';
