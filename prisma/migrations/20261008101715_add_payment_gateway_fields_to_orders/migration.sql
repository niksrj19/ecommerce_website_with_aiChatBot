/*
  Warnings:

  - A unique constraint covering the columns `[gateway_order_id]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[payment_id]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "orders_address_id_idx";

-- DropIndex
DROP INDEX "orders_status_idx";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "gateway_order_id" TEXT,
ADD COLUMN     "payment_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "orders_gateway_order_id_key" ON "orders"("gateway_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_payment_id_key" ON "orders"("payment_id");

-- CreateIndex
CREATE INDEX "orders_gateway_order_id_idx" ON "orders"("gateway_order_id");

-- CreateIndex
CREATE INDEX "orders_payment_id_idx" ON "orders"("payment_id");
