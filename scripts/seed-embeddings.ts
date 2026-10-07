// scripts/seed-embeddings.ts
import { db } from "../src/core/database";
import { SemanticSearchStrategy } from "../src/modules/search/strategies/semantic-search";

async function backfillEmbeddings() {
  console.log("🔍 Checking products with missing embeddings...");

  // Fetch products where embedding is NULL
  const products = await db.$queryRaw<Array<{ id: string; title: string; description: string; brand: string; category: string }>>`
    SELECT id, title, description, brand, category 
    FROM "products" 
    WHERE embedding IS NULL;
  `;

  console.log(`Found ${products.length} products to embed.`);

  for (const product of products) {
    const textToEmbed = `Product: ${product.title}. Brand: ${product.brand}. Category: ${product.category}. Description: ${product.description}`;
    
    try {
      const vector = await SemanticSearchStrategy.generateEmbedding(textToEmbed);
      const vectorString = `[${vector.join(",")}]`;

      await db.$executeRawUnsafe(
        `UPDATE "products" SET embedding = $1::vector WHERE id = $2`,
        vectorString,
        product.id
      );

      console.log(`✅ Embedded: ${product.title}`);
    } catch (err: any) {
      console.error(`❌ Failed embedding for product ${product.id}:`, err.message);
    }
  }

  console.log("🎉 All embeddings generated!");
  process.exit(0);
}

backfillEmbeddings();