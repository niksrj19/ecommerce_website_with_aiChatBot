// scripts/test-redis.ts
import { redis } from "../src/core/redis/client";
import { SlidingWindowRateLimiter } from "../src/core/redis/rate-limiter";
import { SemanticCache } from "../src/core/redis/semantic-cache";

async function runTest() {
  console.log("1. Testing Ping...");
  const pong = await redis.ping();
  console.log("Redis Ping Response:", pong);

  console.log("\n2. Testing Sliding Window Rate Limiter...");
  const res1 = await SlidingWindowRateLimiter.check("test-user", {
    keyPrefix: "api",
    limit: 2,
    windowInSeconds: 10,
  });
  console.log("Check 1:", res1);

  const res2 = await SlidingWindowRateLimiter.check("test-user", {
    keyPrefix: "api",
    limit: 2,
    windowInSeconds: 10,
  });
  console.log("Check 2:", res2);

  const res3 = await SlidingWindowRateLimiter.check("test-user", {
    keyPrefix: "api",
    limit: 2,
    windowInSeconds: 10,
  });
  console.log("Check 3 (Should be rate-limited):", res3);

  console.log("\n3. Testing Semantic Cache...");
  await SemanticCache.set(
    "What is the return window for shoes?",
    "You can return unworn shoes within 30 days for a full refund."
  );

  const match = await SemanticCache.get("How many days do I have to send back sneakers?");
  console.log("Semantic Match Result:", match);

  process.exit(0);
}

runTest();