import { db } from "../../core/database/index.js";
import { CartStorage } from "./cart.storage.js";
import type { CartItemStored } from "./cart.types.js";

export class CartMerger {
  static async mergeGuestCartToUserCart(sessionId: string, userId: string): Promise<void> {
    const [guestItems, userItems] = await Promise.all([
      CartStorage.getCartRaw({ sessionId }),
      CartStorage.getCartRaw({ userId }),
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

    await db.$transaction(async (tx) => {
      if (Object.keys(mergedItems).length > 0) {
        const userCart = await tx.cart.upsert({
          where: { userId },
          create: { userId },
          update: {},
        });

        for (const [variantKey, item] of Object.entries(mergedItems)) {
          await tx.cartItem.upsert({
            where: { cartId_variantKey: { cartId: userCart.id, variantKey } },
            create: { cartId: userCart.id, variantKey, ...item },
            update: item,
          });
        }
      }

      const guestCart = await tx.cart.findUnique({ where: { sessionId } });
      if (guestCart) await tx.cart.delete({ where: { id: guestCart.id } });
    });
  }
}