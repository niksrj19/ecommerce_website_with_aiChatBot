import express, { type Application, type ErrorRequestHandler, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { catalogRoutes } from "./modules/catalog/catalog.routes.js";
// In src/app.ts
import { inventoryRoutes } from "./modules/inventory/inventory.routes.js";
import cookieParser from "cookie-parser";
import { searchRoutes } from "./modules/search/search.routes.js";
import { cartRoutes } from "./modules/cart/cart.routes.js";
import { orderRoutes } from "./modules/order/order.routes.js";
import { addressRoutes } from "./modules/address/address.routes.js";
// import { brandRoutes } from "./modules/brands/brand.routes.js";
import { paymentRoutes } from "./modules/payment/payment.routes.js";
import { aiRoutes } from "./modules/ai/ai.routes.js";
import { env } from "./config/env.js";
import { contactRoutes } from "./modules/contact/contact.routes.js";

export const createApp = (): Application => {

  const app = express();

  // Standard enterprise middlewares
  app.use(helmet());
 app.use(
  cors({
    origin: [env.CLIENT_URL,"https://basesole.online","https://www.basesole.online"] ,
    credentials: true, // Required for HTTP-only refresh token cookies and session headers
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 86400,
    allowedHeaders: ["Content-Type", "Authorization", "x-guest-session-id","sessionid","x-session-id"],
  })
);

  app.use((req, res, next) => {
    const start = Date.now();
    const route = req.originalUrl.split("?")[0];

    res.on("finish", () => {
      // console.log(JSON.stringify({
      //   event: "http_request",
      //   level: res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info",
      //   method: req.method,
      //   route,
      //   status: res.statusCode,
      //   durationMs: Date.now() - start,
      // }));
    });

    res.on("close", () => {
      if (!res.writableFinished) {
        console.warn(JSON.stringify({
          event: "http_request_aborted",
          level: "warn",
          method: req.method,
          route,
          durationMs: Date.now() - start,
        }));
      }
    });

    next();
  });

  // Log before parsing so malformed request bodies are observed too.
  app.use(cookieParser());
  app.use(express.json());

  app.use("/api/payments", paymentRoutes);

// Global JSON parser for all subsequent routes
  
  app.use(express.urlencoded({ extended: true }));
  // Mount Auth Routes
  app.use("/auth", authRoutes);
  app.use("/api", catalogRoutes);
  app.use("/api/inventory", inventoryRoutes);
  // app.use("/api/brands", brandRoutes);
  app.use("/api/search", searchRoutes);
  app.use("/api/cart", cartRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/addresses", addressRoutes);
  app.use("/api/ai", aiRoutes);

  app.use("/api/contact", contactRoutes);

  // Basic Health Check
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  const logUnhandledErrors: ErrorRequestHandler = (error, req, _res, next) => {
    const loggedError = error instanceof Error ? error : new Error(String(error));

    console.error(JSON.stringify({
      event: "http_request_error",
      level: "error",
      method: req.method,
      route: req.originalUrl.split("?")[0],
      error: {
        name: loggedError.name,
        message: loggedError.message,
        stack: loggedError.stack,
      },
    }));

    next(error);
  };

  app.use(logUnhandledErrors);

  return app;
};