import http from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();
const server = http.createServer(app);

server.listen(env.PORT, () => {
  console.log(`🚀 AegisCommerce Server running on http://localhost:${env.PORT}`);
  console.log(`⚙️  Environment: ${env.NODE_ENV}`);
});

// Graceful Shutdown
const shutdown = (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Closing HTTP server...`);
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