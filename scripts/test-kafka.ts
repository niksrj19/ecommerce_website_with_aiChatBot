// scripts/test-kafka.ts
import { kafka } from "../src/core/kafka/client";
import { kafkaProducer } from "../src/core/kafka/producer";
import { KafkaTopic } from "../src/core/kafka/topics";

async function runKafkaDiagnostics() {
  console.log("🔍 [1/4] Connecting to Kafka Admin Client...");
  const admin = kafka.admin();
  await admin.connect();

  try {
    // 1. Verify cluster connection & fetch metadata
    const cluster = await admin.describeCluster();
    console.log(` Connected to Cluster ID: ${cluster.clusterId}`);
    console.log(` Active Brokers: ${cluster.brokers.map((b) => `${b.host}:${b.port} (ID:${b.nodeId})`).join(", ")}`);

    // 2. Ensure test topics exist
    const existingTopics = await admin.listTopics();
    console.log(` Existing Topics in Cluster: ${existingTopics.length ? existingTopics.join(", ") : "(None)"}`);

    const requiredTopics = [KafkaTopic.ORDER_EVENTS, KafkaTopic.AI_HITL_EVENTS];
    const missingTopics = requiredTopics.filter((t) => !existingTopics.includes(t));

    if (missingTopics.length > 0) {
      console.log(`⚠️ Creating missing topics: ${missingTopics.join(", ")}`);
      await admin.createTopics({
        topics: missingTopics.map((topic) => ({
          topic,
          numPartitions: 2,
          replicationFactor: 1, // 1 for local single-node docker setup
        })),
      });
      console.log(" Topics created successfully.");
    }
  } finally {
    console.log(" Disconnecting from Kafka Admin Client...");
    await admin.disconnect();
  }

  // 3. Set up a Test Consumer to listen for the message
  console.log("\n🎧 [2/4] Initializing Test Consumer...");
  const consumerGroupId = `test-group-${Math.floor(Math.random() * 1000000)}`;
  const consumer = kafka.consumer({ groupId: consumerGroupId });

  await consumer.connect();
  console.log("Consumer Connected Successfully with Group ID:", consumerGroupId);

  await consumer.subscribe({
    topics: [KafkaTopic.ORDER_EVENTS, KafkaTopic.AI_HITL_EVENTS],
    fromBeginning: false,
  });

  // Wait until the consumer has joined the group and partitions are assigned
  const consumerReadyPromise = new Promise<void>((resolve) => {
    consumer.on(consumer.events.GROUP_JOIN, () => {
      console.log("Consumer joined group and partition assignment complete.");
      resolve();
    });
  });

  const messagePromise = new Promise<{ topic: string; payload: any }>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("⏰ Timeout: Consumer did not receive published message within 15 seconds."));
    }, 15000);

    consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        clearTimeout(timeout);
        const value = message.value?.toString();
        resolve({
          topic,
          payload: value ? JSON.parse(value) : null,
        });
      },
    });
  });

  // MUST wait for consumer readiness before producing
  await consumerReadyPromise;

  // 4. Connect Producer & Publish Test Message
  console.log("\n🚀 [3/4] Publishing typed event via kafkaProducer...");
  await kafkaProducer.connect();

  const testOrderId = `order-test-${Date.now()}`;
  const testPayload = {
    type: "ORDER_CREATED" as const,
    orderId: testOrderId,
    userId: "usr_test_verification",
    totalAmount: 129.99,
    items: [
      {
        productId: "prod_sample_shoe",
        quantity: 1,
        unitPrice: 129.99,
      },
    ],
    timestamp: new Date().toISOString(),
  };

  await kafkaProducer.publish(KafkaTopic.ORDER_EVENTS, testPayload, testOrderId);
  console.log(` Sent message to topic "${KafkaTopic.ORDER_EVENTS}" with key "${testOrderId}"`);
  // 5. Await consumption & assert content
  console.log("\n⏳ [4/4] Awaiting event reception on Consumer...");
  const received = await messagePromise;

  console.log("\n------------------------------------------------");
  console.log(" EVENT RECEIVED SUCCESSFULLY!");
  console.log(`Topic:     ${received.topic}`);
  console.log(`Payload:   `, JSON.stringify(received.payload, null, 2));
  console.log("------------------------------------------------");

  if (received.payload?.orderId === testOrderId) {
    console.log(" Payload assertion passed! Kafka infrastructure is 100% operational.");
  } else {
    console.warn("⚠️ Received event but orderId mismatch.");
  }

  // Graceful cleanup
  await consumer.disconnect();
  await kafkaProducer.disconnect();
  process.exit(0);
}

runKafkaDiagnostics().catch(async (err) => {
  console.error("\n❌ Kafka Diagnostic Failure:", err.message);
  try {
    await kafkaProducer.disconnect();
  } catch {}
  process.exit(1);
});