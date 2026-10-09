// src/core/kafka/producer.ts
import { baseProducer } from "./client";
import { KafkaTopic, TopicPayloadMap } from "./topics";

class KafkaProducerService {
  private isConnected = false;

  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await baseProducer.connect();
        this.isConnected = true;
        console.log(" Connected to Kafka Broker successfully");
      } catch (error: any) {
        console.error("❌ Kafka Connection Error:", error.message);
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await baseProducer.disconnect();
      this.isConnected = false;
      console.log("🛑 Disconnected from Kafka");
    }
  }

  /**
   * Publishes strongly typed messages to any registered topic.
   * Key guarantees message ordering within the partition (e.g. orderId or userId).
   */
  async publish<T extends KafkaTopic>(
    topic: T,
    message: TopicPayloadMap[T],
    key?: string
  ): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      await baseProducer.send({
        topic,
        messages: [
          {
            key: key || undefined,
            value: JSON.stringify(message),
            timestamp: Date.now().toString(),
          },
        ],
      });
    } catch (err: any) {
      console.error(`Failed to publish message to topic ${topic}:`, err.message);
      throw err;
    }
  }

  /**
   * Batch publishing for bulk events (e.g. vector embedding chunks)
   */
  async publishBatch<T extends KafkaTopic>(
    topic: T,
    messages: Array<{ key?: string; value: TopicPayloadMap[T] }>
  ): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    await baseProducer.send({
      topic,
      messages: messages.map((m) => ({
        key: m.key,
        value: JSON.stringify(m.value),
      })),
    });
  }
}

export const kafkaProducer = new KafkaProducerService();