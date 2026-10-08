// src/modules/cart/cart.merger.ts
import { redis } from "../../core/redis/client.js";
import { db } from "../../core/database";
import { CartStorage } from "./cart.storage";
import { CartItemStored } from "./cart.types";

export class CartMerger {
  static async mergeGuestCartToUserCart(sessionId: string, userId: string): Promise<void> {
    const guestKey = CartStorage.buildCartKey({ sessionId });
    const userKey = CartStorage.buildCartKey({ userId });

    const [guestItems, userItems] = await Promise.all([
      CartStorage.getCartRaw(guestKey),
      CartStorage.getCartRaw(userKey),
    ]);

    const variantKeys = Array.from(new Set([...Object.keys(guestItems), ...Object.keys(userItems)]));
    if (variantKeys.length === 0) return;

    // Fetch live inventory for all items in both carts
    const productIds = Array.from(
      new Set(
        [...Object.values(guestItems), ...Object.values(userItems)].map((i) => i.productId)
      )
    );

    const inventoryRecords = await db.inventory.findMany({
      where: { productId: { in: productIds } },
    });

    const mergedItems: Record<string, CartItemStored> = { ...userItems };

    for (const [variantKey, guestItem] of Object.entries(guestItems)) {
      const userItem = userItems[variantKey];
      const combinedQuantity = (userItem?.quantity || 0) + guestItem.quantity;

      // Find stock matching variant or default to total product stock
      const matchedInventory = inventoryRecords.find(
        (inv) =>
          inv.productId === guestItem.productId &&
          inv.size?.toLowerCase() === guestItem.size.toLowerCase() &&
          inv.color?.toLowerCase() === guestItem.color.toLowerCase()
      );

      const availableStock = matchedInventory
        ? Math.max(0, matchedInventory.quantityInStock - matchedInventory.reserved)
        : 999;

      const finalQuantity = Math.min(combinedQuantity, availableStock);

      if (finalQuantity > 0) {
        mergedItems[variantKey] = {
          productId: guestItem.productId,
          size: guestItem.size,
          color: guestItem.color,
          quantity: finalQuantity,
        };
      }
    }

    // Persist to user cart and clean up guest cart atomically
    const pipeline = redis.multi();
    for (const [vKey, item] of Object.entries(mergedItems)) {
      pipeline.hset(userKey, vKey, JSON.stringify(item));
    }
    pipeline.expire(userKey, 30 * 24 * 60 * 60); // 30-day TTL
    pipeline.del(guestKey);

    await pipeline.exec();
  }
}