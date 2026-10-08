// src/modules/cart/cart.controller.ts
import { Request, Response } from "express";
import { ZodError } from "zod";
import { CartService } from "./cart.service";
import { CartMerger } from "./cart.merger";
import {
  addCartItemSchema,
  updateCartItemSchema,
  removeCartItemSchema,
  mergeCartSchema,
} from "./cart.schema";

export class CartController {
  private static resolveTarget(req: Request): { userId?: string; sessionId?: string } {
    if (req.user?.userId) {
      return { userId: req.user.userId };
    }

    // Guest fallback: read from header or cookie
    const sessionId =
      (req.headers["x-session-id"] as string) || req.cookies?.sessionId;

    if (!sessionId) {
      const error: any = new Error("Missing session ID header (x-session-id) or auth credentials");
      error.statusCode = 400;
      throw error;
    }

    return { sessionId };
  }

  // GET /api/cart
  static async getCart(req: Request, res: Response): Promise<void> {
    try {
      const target = CartController.resolveTarget(req);
      const cart = await CartService.getCart(target);
      res.status(200).json(cart);
    } catch (error: any) {
      CartController.handleError(error, res, "Failed to fetch cart");
    }
  }

  // POST /api/cart/items
  static async addItem(req: Request, res: Response): Promise<void> {
    try {
      const target = CartController.resolveTarget(req);
      const validated = addCartItemSchema.parse(req.body);
      const cart = await CartService.addItem(target, validated);
      res.status(200).json(cart);
    } catch (error: any) {
      CartController.handleError(error, res, "Failed to add item to cart");
    }
  }

  // PUT /api/cart/items
  static async updateItem(req: Request, res: Response): Promise<void> {
    try {
      const target = CartController.resolveTarget(req);
      const validated = updateCartItemSchema.parse(req.body);
      const cart = await CartService.updateItem(target, validated);
      res.status(200).json(cart);
    } catch (error: any) {
      CartController.handleError(error, res, "Failed to update cart item");
    }
  }

  // DELETE /api/cart/items
  static async removeItem(req: Request, res: Response): Promise<void> {
    try {
      const target = CartController.resolveTarget(req);
      const validated = removeCartItemSchema.parse(req.body);
      const cart = await CartService.removeItem(target, validated);
      res.status(200).json(cart);
    } catch (error: any) {
      CartController.handleError(error, res, "Failed to remove item from cart");
    }
  }

  // DELETE /api/cart
  static async clearCart(req: Request, res: Response): Promise<void> {
    try {
      const target = CartController.resolveTarget(req);
      await CartService.clearCart(target);
      res.status(200).json({ message: "Cart cleared successfully" });
    } catch (error: any) {
      CartController.handleError(error, res, "Failed to clear cart");
    }
  }

  // POST /api/cart/merge (Authenticated only)
  static async mergeCart(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: "Unauthorized: User must be logged in to merge carts" });
        return;
      }

      const { sessionId } = mergeCartSchema.parse(req.body);
      await CartMerger.mergeGuestCartToUserCart(sessionId, req.user.userId);

      const updatedCart = await CartService.getCart({ userId: req.user.userId });
      res.status(200).json({ message: "Carts merged successfully", cart: updatedCart });
    } catch (error: any) {
      CartController.handleError(error, res, "Failed to merge carts");
    }
  }

  private static handleError(error: any, res: Response, fallbackMsg: string): void {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: "Validation Failed",
        details: error.issues.map((e) => ({ field: e.path.join("."), message: e.message })),
      });
      return;
    }
    if (error.statusCode) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error(`${fallbackMsg}:`, error);
    res.status(500).json({ error: fallbackMsg });
  }
}