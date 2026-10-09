// src/core/kafka/client.ts
import { Kafka, logLevel, Partitioners } from "kafkajs";
import { env } from "../../config/env";

const brokers = (env.KAFKA_BROKERS || "localhost:9092")
  .split(",")
  .map((b) => b.trim());

export const kafka = new Kafka({
  clientId: env.KAFKA_CLIENT_ID || "aegis-commerce-backend",
  brokers,
  logLevel: process.env.NODE_ENV === "production" ? logLevel.ERROR : logLevel.WARN,
  retry: {
    initialRetryTime: 300,
    retries: 8,
  },
});

// Configure standard producer with DefaultPartitioner
export const baseProducer = kafka.producer({
  createPartitioner: Partitioners.DefaultPartitioner,
  allowAutoTopicCreation: true,
});