import { Request, Response } from "express";
import { ZodError } from "zod";
import { OrderService } from "./order.service";
import {
  createOrderSchema,
  orderIdParamSchema,
  orderPaginationSchema,
} from "./order.schema";

export class OrderController {
  // POST /api/orders
  static async createOrder(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: "User not loggedIn" });
        return;
      }

      const validatedBody = createOrderSchema.parse(req.body);
      const order = await OrderService.checkout(
        req.user.userId,
        req.user.email,
        validatedBody
      );

      res.status(201).json({
        message: "Order placed successfully",
        orderId: order.id,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        items: order.items,
      });
    } catch (error: any) {
      OrderController.handleError(error, res, "Failed to place order");
    }
  }

  // GET /api/orders
  static async getPastOrders(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: "User not loggedIn" });
        return;
      }

      const { page, limit } = orderPaginationSchema.parse(req.query);
      const orders = await OrderService.getUserOrders(req.user.userId, page, limit);

      res.status(200).json(orders);
    } catch (error: any) {
      OrderController.handleError(error, res, "Failed to retrieve past orders");
    }
  }

  // GET /api/orders/:order_id
  static async getOrderDetails(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: "User not loggedIn" });
        return;
      }

      const { order_id } = orderIdParamSchema.parse(req.params);
      const order = await OrderService.getOrderById(order_id, req.user.userId);

      res.status(200).json(order);
    } catch (error: any) {
      OrderController.handleError(error, res, "Failed to retrieve order details");
    }
  }

  private static handleError(error: any, res: Response, defaultMessage: string): void {
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
    console.error(`${defaultMessage}:`, error);
    res.status(500).json({ error: error.message || defaultMessage });
  }
} 