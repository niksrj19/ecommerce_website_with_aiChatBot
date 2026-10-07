/*
  Warnings:

  - You are about to drop the column `total_value` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `brand_id` on the `products` table. All the data in the column will be lost.
  - You are about to drop the `brands` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `brand` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_brand_id_fkey";

-- DropIndex
DROP INDEX "products_brand_id_idx";

-- AlterTable
ALTER TABLE "inventory" DROP COLUMN "total_value";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "brand_id",
ADD COLUMN     "brand" TEXT NOT NULL;

-- DropTable
DROP TABLE "brands";

-- CreateIndex
CREATE INDEX "products_brand_idx" ON "products"("brand");
