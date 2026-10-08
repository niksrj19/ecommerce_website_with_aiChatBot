// src/modules/cart/cart.service.ts
import { db } from "../../core/database";
import { CartStorage } from "./cart.storage";
import {
  AddCartItemInput,
  UpdateCartItemInput,
  RemoveCartItemInput,
} from "./cart.schema";
import { CartResponse, EnrichedCartItem } from "./cart.types";

export class CartService {
  static async getCart(target: { userId?: string; sessionId?: string }): Promise<CartResponse> {
    const cartKey = CartStorage.buildCartKey(target);
    const rawItems = await CartStorage.getCartRaw(cartKey);

    const variantKeys = Object.keys(rawItems);
    if (variantKeys.length === 0) {
      return { items: [], subtotal: 0, totalItems: 0, warnings: [] };
    }

    const productIds = Array.from(new Set(Object.values(rawItems).map((i) => i.productId)));

    // Fetch live product and inventory records in parallel
    const [products, inventoryRecords] = await Promise.all([
      db.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, title: true, brand: true, price: true, imageUrl: true, inStock: true },
      }),
      db.inventory.findMany({
        where: { productId: { in: productIds } },
      }),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const enrichedItems: EnrichedCartItem[] = [];
    const warnings: string[] = [];

    for (const [variantKey, item] of Object.entries(rawItems)) {
      const product = productMap.get(item.productId);

      if (!product) {
        // Clean up stale or deleted product reference from Redis
        await CartStorage.removeItem(cartKey, item.productId, item.size, item.color);
        warnings.push(`A product in your cart is no longer available and was removed.`);
        continue;
      }

      // Check stock
      const matchedInventory = inventoryRecords.find(
        (inv) =>
          inv.productId === item.productId &&
          inv.size?.toLowerCase() === item.size.toLowerCase() &&
          inv.color?.toLowerCase() === item.color.toLowerCase()
      );

      const availableStock = matchedInventory
        ? Math.max(0, matchedInventory.quantityInStock - matchedInventory.reserved)
        : product.inStock ? 50 : 0;

      let effectiveQuantity = item.quantity;
      let stockWarning: string | undefined;

      if (availableStock <= 0) {
        stockWarning = `"${product.title}" (${item.size}, ${item.color}) is currently out of stock.`;
        warnings.push(stockWarning);
      } else if (item.quantity > availableStock) {
        effectiveQuantity = availableStock;
        stockWarning = `Quantity reduced to ${availableStock} based on available stock.`;
        warnings.push(`"${product.title}": ${stockWarning}`);

        // Update adjusted quantity back in Redis
        await CartStorage.setItem(cartKey, { ...item, quantity: effectiveQuantity });
      }

      const unitPrice = Number(product.price);
      enrichedItems.push({
        variantKey,
        productId: item.productId,
        size: item.size,
        color: item.color,
        quantity: effectiveQuantity,
        title: product.title,
        brand: product.brand,
        imageUrl: product.imageUrl,
        unitPrice,
        totalPrice: Number((unitPrice * effectiveQuantity).toFixed(2)),
        availableStock,
        stockWarning,
      });
    }

    const subtotal = Number(
      enrichedItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)
    );
    const totalItems = enrichedItems.reduce((sum, item) => sum + item.quantity, 0);

    return { items: enrichedItems, subtotal, totalItems, warnings };
  }

  static async addItem(
    target: { userId?: string; sessionId?: string },
    input: AddCartItemInput
  ): Promise<CartResponse> {
    const { productId, size, color, quantity } = input;
    const cartKey = CartStorage.buildCartKey(target);

    // 1. Verify Product exists
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true, inStock: true },
    });

    if (!product || !product.inStock) {
      const error: any = new Error("Product is out of stock or does not exist");
      error.statusCode = 404;
      throw error;
    }

    // 2. Verify Variant Stock in inventory table
    const inventory = await db.inventory.findFirst({
      where: {
        productId,
        size: { equals: size, mode: "insensitive" },
        color: { equals: color, mode: "insensitive" },
      },
    });

    const rawItems = await CartStorage.getCartRaw(cartKey);
    const variantKey = CartStorage.getVariantKey(productId, size, color);
    const existingQuantity = rawItems[variantKey]?.quantity || 0;
    const requestedTotal = existingQuantity + quantity;

    if (inventory) {
      const available = inventory.quantityInStock - inventory.reserved;
      if (requestedTotal > available) {
        const error: any = new Error(
          `Insufficient stock. Only ${Math.max(0, available)} units available for this variant.`
        );
        error.statusCode = 400;
        throw error;
      }
    }

    // 3. Persist to Redis
    await CartStorage.setItem(cartKey, {
      productId,
      size,
      color,
      quantity: requestedTotal,
    });

    return this.getCart(target);
  }

  static async updateItem(
    target: { userId?: string; sessionId?: string },
    input: UpdateCartItemInput
  ): Promise<CartResponse> {
    const { productId, size, color, quantity } = input;
    const cartKey = CartStorage.buildCartKey(target);

    if (quantity === 0) {
      await CartStorage.removeItem(cartKey, productId, size, color);
      return this.getCart(target);
    }

    // Check inventory stock limit
    const inventory = await db.inventory.findFirst({
      where: {
        productId,
        size: { equals: size, mode: "insensitive" },
        color: { equals: color, mode: "insensitive" },
      },
    });

    if (inventory) {
      const available = inventory.quantityInStock - inventory.reserved;
      if (quantity > available) {
        const error: any = new Error(
          `Requested quantity (${quantity}) exceeds available stock (${Math.max(0, available)}).`
        );
        error.statusCode = 400;
        throw error;
      }
    }

    await CartStorage.setItem(cartKey, { productId, size, color, quantity });
    return this.getCart(target);
  }

  static async removeItem(
    target: { userId?: string; sessionId?: string },
    input: RemoveCartItemInput
  ): Promise<CartResponse> {
    const cartKey = CartStorage.buildCartKey(target);
    await CartStorage.removeItem(cartKey, input.productId, input.size, input.color);
    return this.getCart(target);
  }

  static async clearCart(target: { userId?: string; sessionId?: string }): Promise<void> {
    const cartKey = CartStorage.buildCartKey(target);
    await CartStorage.clearCart(cartKey);
  }
}