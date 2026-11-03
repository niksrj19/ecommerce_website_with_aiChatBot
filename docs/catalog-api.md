# Catalog API

The catalog uses normalized `brands`, hierarchical `categories`, `products`,
`product_variants`, `inventory`, `product_images`, and `product_review_stats`
tables. Existing product, cart, and checkout endpoints remain available.

## Public endpoints

- `GET /api/brands?page=1&limit=50&q=...` returns a page of active brands and
  pagination metadata. `limit` is capped at 100.
- `GET /api/brands/:slug` returns a brand and its product count.
- `GET /api/categories?page=1&limit=50&parentId=<uuid>&q=...` returns a page of
  categories and child/product counts. Omitting `parentId` returns root
  categories. Fetch a category's children by supplying its ID as `parentId`;
  results are paginated rather than loading a large tree into one response.
- `GET /api/categories/:slug` returns category details, its parent, and counts.
- `GET /api/products?page=1&limit=20` returns the existing paginated product
  listing and filters.
- `GET /api/product/slug/:slug` returns PDP content: product specs, brand,
  category, images, active variants, inventory, and pre-aggregated review
  statistics.
- `GET /api/products/:id/review-stats` returns the review aggregate separately
  for a client component that loads ratings independently.
- `GET /api/inventory/product/:productId/availability` returns active variant
  stock availability without store identifiers; it is public and uncached.
- `GET /api/product/:id` remains available for ID-based product lookup.

PDP content is cached in Redis for five minutes; variant stock is queried from
PostgreSQL for each PDP request. The PDP response advertises a five-second
shared HTTP cache lifetime, and the standalone inventory availability response
uses `Cache-Control: no-store`. Brand and category lookups are cached for
fifteen minutes, and product listings for thirty seconds.

## Product administration

- `POST /api/products` creates a product, its initial variants from the
  supplied sizes and colors, product images, and zeroed review statistics.
  Optional `slug` and object-valued `specs` fields can be supplied.
- `PUT /api/products/:id` updates the product and can replace or append images.
- `DELETE /api/products/:id` removes the product and its dependent catalog data.
- `POST /api/products/:id/variants` creates an additional variant with
  `sku`, `price`, optional `size`/`color`, and optional `attributes`.
- `POST /api/inventory` can include `variantId` to associate a stock record with
  a variant. Existing inventory requests without `variantId` remain supported.
- `PATCH /api/inventory/:id` retains the existing stock adjustment behavior.

Product writes invalidate Redis catalog entries. Stock is deliberately not read
from cached PDP data so changes to the hot-write inventory table are visible on
the next request.

Apply the additive schema migration with:

```sh
npx prisma migrate deploy
npx prisma generate
```
