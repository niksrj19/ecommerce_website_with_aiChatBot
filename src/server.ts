import http from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import "./modules/order/order.worker";
// In src/server.ts
import { kafkaProducer } from "./core/kafka/producer";

const app = createApp();
const server = http.createServer(app);

server.listen(env.PORT, () => {
  console.log(`🚀 AegisCommerce Server running on http://localhost:${env.PORT}`);
  console.log(`⚙️  Environment: ${env.NODE_ENV}`);
});

// Connect to Kafka at boot
kafkaProducer.connect().catch((err) => {
  console.error("Failed to initialize Kafka producer:", err);
});

// Graceful Shutdown
const shutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Closing server and server's resources...`);
  await kafkaProducer.disconnect();
  server.close(() => {
    console.log("HTTP server closed. Exiting process.");
    process.exit(0);
  });

  // Force shutdown if connections do not close in 10 seconds
  setTimeout(() => {
    console.error("Forcing shutdown after 10s timeout.");
    process.exit(1);
  }, 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));