import { db } from "../../core/database/index.js";
import type { CartItemStored, CartTarget } from "./cart.types.js";

export class CartStorage {
  private static async findCart(target: CartTarget) {
    return target.userId
      ? db.cart.findUnique({ where: { userId: target.userId } })
      : db.cart.findUnique({ where: { sessionId: target.sessionId } });
  }

  private static async getOrCreateCart(target: CartTarget) {
    return target.userId
      ? db.cart.upsert({
          where: { userId: target.userId },
          create: { userId: target.userId },
          update: {},
        })
      : db.cart.upsert({
          where: { sessionId: target.sessionId },
          create: { sessionId: target.sessionId },
          update: {},
        });
  }

  static getVariantKey(productId: string, size: string, color: string): string {
    return `${productId}:${size.trim().toLowerCase()}:${color.trim().toLowerCase()}`;
  }

  static async getCartRaw(target: CartTarget): Promise<Record<string, CartItemStored>> {
    const cart = await this.findCart(target);
    const items: Record<string, CartItemStored> = {};
    if (!cart) return items;

    const cartItems = await db.cartItem.findMany({ where: { cartId: cart.id } });
    for (const item of cartItems) {
      items[item.variantKey] = {
        productId: item.productId,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
      };
    }
    return items;
  }

  static async setItem(target: CartTarget, item: CartItemStored): Promise<void> {
    const cart = await this.getOrCreateCart(target);
    const variantKey = this.getVariantKey(item.productId, item.size, item.color);
    await db.cartItem.upsert({
      where: { cartId_variantKey: { cartId: cart.id, variantKey } },
      create: { cartId: cart.id, variantKey, ...item },
      update: { ...item },
    });
  }

  static async removeItem(target: CartTarget, productId: string, size: string, color: string): Promise<void> {
    const cart = await this.findCart(target);
    if (!cart) return;
    const variantKey = this.getVariantKey(productId, size, color);
    await db.cartItem.deleteMany({ where: { cartId: cart.id, variantKey } });
  }

  static async clearCart(target: CartTarget): Promise<void> {
    const cart = await this.findCart(target);
    if (cart) await db.cart.delete({ where: { id: cart.id } });
  }
}