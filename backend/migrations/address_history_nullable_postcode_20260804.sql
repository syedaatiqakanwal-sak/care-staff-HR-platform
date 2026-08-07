-- Allow international addresses without a UK postcode (Issue 1 / client report).
-- Additive: DROP NOT NULL only; existing rows unchanged.
ALTER TABLE address_history ALTER COLUMN postcode DROP NOT NULL;
ALTER TABLE address_history ALTER COLUMN line1 DROP NOT NULL;
