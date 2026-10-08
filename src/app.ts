import express, { type Application, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { authRoutes } from "./modules/auth/auth.routes";
import { catalogRoutes } from "./modules/catalog/catalog.routes";
// In src/app.ts
import { inventoryRoutes } from "./modules/inventory/inventory.routes";
import cookieParser from "cookie-parser";
import { searchRoutes } from "./modules/search/search.routes";
import { cartRoutes } from "./modules/cart/cart.routes";
import { orderRoutes } from "./modules/order/order.routes";
import { addressRoutes } from "./modules/address/address.routes";
// import { brandRoutes } from "./modules/brands/brand.routes";

export const createApp = (): Application => {
  const app = express();

  // Standard enterprise middlewares
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  // Add cookie parser middleware HERE
app.use(cookieParser());

  // Mount Auth Routes
  app.use("/auth", authRoutes);
  app.use("/api", catalogRoutes);
  app.use("/api/inventory", inventoryRoutes);
  // app.use("/api/brands", brandRoutes);
  app.use("/api/search", searchRoutes);
  app.use("/api/cart", cartRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/addresses", addressRoutes);

  // Basic Health Check
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  return app;
};