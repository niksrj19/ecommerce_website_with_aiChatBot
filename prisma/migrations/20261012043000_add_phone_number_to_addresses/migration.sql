ALTER TABLE "addresses"
ADD COLUMN "phone_number" TEXT;

UPDATE "addresses" AS address
SET "phone_number" = order_phone."phone_number"
FROM (
  SELECT DISTINCT ON ("address_id")
    "address_id",
    NULLIF(BTRIM("shipping_address"->>'phoneNumber'), '') AS "phone_number"
  FROM "orders"
  WHERE "address_id" IS NOT NULL
    AND LENGTH(BTRIM("shipping_address"->>'phoneNumber')) >= 7
  ORDER BY "address_id", "created_at" DESC
) AS order_phone
WHERE address."id" = order_phone."address_id"
  AND order_phone."phone_number" IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "addresses"
    WHERE "phone_number" IS NULL OR BTRIM("phone_number") = ''
  ) THEN
    RAISE EXCEPTION 'Cannot make addresses.phone_number required: backfill valid phone numbers for existing addresses without a linked order phone number';
  END IF;
END $$;

ALTER TABLE "addresses"
ALTER COLUMN "phone_number" SET NOT NULL;
