-- 1. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Add vector(1536) embedding column
ALTER TABLE "products" 
ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

-- 3. Add generated tsvector column combining title (Weight A), description (Weight B), and brand (Weight B)
ALTER TABLE "products"
ADD COLUMN IF NOT EXISTS "search_vector" tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
  setweight(to_tsvector('english', coalesce("description", '')), 'B') ||
  setweight(to_tsvector('english', coalesce("brand", '')), 'B')
) STORED;

-- 4. Create GIN index for full-text search & trigram index for typo tolerance
CREATE INDEX IF NOT EXISTS "idx_products_search_vector" ON "products" USING GIN ("search_vector");
CREATE INDEX IF NOT EXISTS "idx_products_title_trgm" ON "products" USING GIN ("title" gin_trgm_ops);

-- 5. Create HNSW Cosine Distance Index for vector retrieval
CREATE INDEX IF NOT EXISTS "idx_products_embedding_hnsw" ON "products" 
USING hnsw ("embedding" vector_cosine_ops)
WITH (m = 16, ef_construction = 64);