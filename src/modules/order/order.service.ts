import { Prisma } from "@prisma/client";
import { db } from "../../core/database";
import { CartStorage } from "../cart/cart.storage";
import { CreateOrderInput } from "./order.schema";
import { dispatchOrderCreatedJob } from "./order.queue";

export class OrderService {
  static async checkout(userId: string, userEmail: string, input: CreateOrderInput) {
    const cartKey = CartStorage.buildCartKey({ userId });
    const cartItems = await CartStorage.getCartRaw(cartKey);

    const lineItems = Object.values(cartItems);
    if (lineItems.length === 0) {
      const error: any = new Error("Cart is empty");
      error.statusCode = 400;
      throw error;
    }

    const productIds = Array.from(new Set(lineItems.map((item) => item.productId)));

    // Execute PostgreSQL Transaction with Pessimistic Row Locking
    const order = await db.$transaction(async (tx) => {
      // 1. Lock all relevant inventory rows with FOR UPDATE to prevent race conditions
      const inventories = await tx.$queryRaw<
        Array<{
          id: string;
          product_id: string;
          size: string | null;
          color: string | null;
          quantity_in_stock: number;
          reserved: number;
          unit_price: string;
        }>
      >`
        SELECT id, product_id, size, color, quantity_in_stock, reserved, unit_price
        FROM "inventory"
        WHERE product_id = ANY(${productIds})
        FOR UPDATE;
      `;

      // 2. Fetch authoritative products
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, title: true, price: true, inStock: true },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      let calculatedTotal = new Prisma.Decimal(0);
      const itemsToInsert: Array<{
        productId: string;
        title: string;
        size: string;
        color: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
        subtotal: Prisma.Decimal;
      }> = [];

      // 3. Verify stock availability and compute authoritative prices
      for (const item of lineItems) {
        const product = productMap.get(item.productId);
        if (!product || !product.inStock) {
          throw new Error(`Product not available for checkout.`);
        }

        const matchedInv = inventories.find(
          (inv) =>
            inv.product_id === item.productId &&
            inv.size?.toLowerCase() === item.size.toLowerCase() &&
            inv.color?.toLowerCase() === item.color.toLowerCase()
        );

        if (matchedInv) {
          const availableStock = matchedInv.quantity_in_stock - matchedInv.reserved;
          if (item.quantity > availableStock) {
            throw new Error(
              `Insufficient stock for "${product.title}" (${item.size}, ${item.color}). Available: ${availableStock}`
            );
          }

          // Decrement stock atomically
          await tx.inventory.update({
            where: { id: matchedInv.id },
            data: { quantityInStock: { decrement: item.quantity } },
          });
        }

        const unitPrice = new Prisma.Decimal(product.price);
        const subtotal = unitPrice.mul(item.quantity);
        calculatedTotal = calculatedTotal.add(subtotal);

        itemsToInsert.push({
          productId: item.productId,
          title: product.title,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          unitPrice,
          subtotal,
        });

        // Increment sales counter
        await tx.product.update({
          where: { id: item.productId },
          data: { salesCount: { increment: item.quantity } },
        });
      }

      // 4. Create Order & nested OrderItems
      return tx.order.create({
        data: {
          userId,
          status: "CONFIRMED",
          paymentStatus: "PAID",
          paymentMethod: input.paymentMethod,
          totalAmount: calculatedTotal,
          shippingAddress: input.shippingAddress as any,
          items: {
            create: itemsToInsert.map((i) => ({
              productId: i.productId,
              title: i.title,
              size: i.size,
              color: i.color,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              subtotal: i.subtotal,
            })),
          },
        },
        include: { items: true },
      });
    });

    // 5. Clear Active Redis Cart
    await CartStorage.clearCart(cartKey);

    // 6. Dispatch Async BullMQ Job (fire-and-forget)
    dispatchOrderCreatedJob({
      orderId: order.id,
      userEmail,
      totalAmount: Number(order.totalAmount),
      items: order.items.map((i) => ({
        title: i.title,
        size: i.size,
        color: i.color,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
      })),
    }).catch((err) => console.error("Failed to enqueue email confirmation job:", err));

    return order;
  }

  static async getUserOrders(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [totalItems, orders] = await db.$transaction([
      db.order.count({ where: { userId } }),
      db.order.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              product: {
                select: { imageUrl: true, brand: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      orders,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        limit,
      },
    };
  }

  static async getOrderById(orderId: string, userId: string) {
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        userId, // Ensures a user can only access their own order
      },
      include: {
        items: {
          include: {
            product: {
              select: { imageUrl: true, brand: true },
            },
          },
        },
      },
    });

    if (!order) {
      const error: any = new Error("Order not found");
      error.statusCode = 404;
      throw error;
    }

    return order;
  }
}