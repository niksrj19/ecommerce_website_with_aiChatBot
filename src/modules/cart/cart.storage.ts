// src/modules/cart/cart.storage.ts
import { redis } from "../../core/redis/client.js";
import { CartItemStored } from "./cart.types";

export class CartStorage {
  private static AUTH_CART_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days for authenticated users
  private static GUEST_CART_TTL_SECONDS = 48 * 60 * 60;       // 48 hours for guests

  static buildCartKey(target: { userId?: string; sessionId?: string }): string {
    if (target.userId) {
      return `cart:user:${target.userId}`;
    }
    if (target.sessionId) {
      return `cart:guest:${target.sessionId}`;
    }
    throw new Error("Either userId or sessionId must be provided for cart operations");
  }

  static getVariantKey(productId: string, size: string, color: string): string {
    return `${productId}:${size.trim().toLowerCase()}:${color.trim().toLowerCase()}`;
  }

  static async getCartRaw(key: string): Promise<Record<string, CartItemStored>> {
    const rawData = await redis.hgetall(key);
    const items: Record<string, CartItemStored> = {};

    for (const [variantKey, jsonString] of Object.entries(rawData)) {
      try {
        items[variantKey] = JSON.parse(jsonString);
      } catch {
        // Skip malformed entries
      }
    }

    return items;
  }

  static async setItem(key: string, item: CartItemStored): Promise<void> {
    const variantKey = this.getVariantKey(item.productId, item.size, item.color);
    const isGuest = key.startsWith("cart:guest:");
    const ttl = isGuest ? this.GUEST_CART_TTL_SECONDS : this.AUTH_CART_TTL_SECONDS;

    await redis
      .multi()
      .hset(key, variantKey, JSON.stringify(item))
      .expire(key, ttl)
      .exec();
  }

  static async removeItem(key: string, productId: string, size: string, color: string): Promise<void> {
    const variantKey = this.getVariantKey(productId, size, color);
    await redis.hdel(key, variantKey);
  }

  static async clearCart(key: string): Promise<void> {
    await redis.del(key);
  }
}