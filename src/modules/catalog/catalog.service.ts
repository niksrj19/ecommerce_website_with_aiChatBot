// src/modules/catalog/catalog.service.ts
import { Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { db } from "../../core/database/index.js";
import { CatalogCache } from "../../core/redis/catalog-cache.js";
import {
  CreateProductInput,
  CreateProductVariantInput,
  GetProductsQuery,
  LookupQuery,
  UpdateProductInput,
} from "./catalog.schema.js";
import { SemanticSearchStrategy } from "../search/strategies/semantic-search.js";

export class CatalogService {
  private static readonly PDP_CACHE_TTL_SECONDS = 300;
  private static readonly LOOKUP_CACHE_TTL_SECONDS = 900;

  private static lookupSlug(value: string): string {
    const name = value.trim();
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
    const suffix = createHash("md5").update(name.toLowerCase()).digest("hex").slice(0, 8);
    return `${base}-${suffix}`;
  }

  private static async resolveBrand(name: string) {
    const slug = this.lookupSlug(name);
    return db.brand.upsert({
      where: { slug },
      create: { name: name.trim(), slug },
      update: {},
    });
  }

  private static async resolveCategory(name: string) {
    const slug = this.lookupSlug(name);
    return db.category.upsert({
      where: { slug },
      create: { name: name.trim(), slug },
      update: {},
    });
  }

  static async getBrands(query: LookupQuery) {
    const { page, limit, q } = query;
    const key = `brands:${page}:${limit}:${q ?? ""}`;
    const cached = await CatalogCache.get<{
      brands: unknown[];
      pagination: { totalItems: number; totalPages: number; currentPage: number; limit: number };
    }>(key);
    if (cached) return cached;

    const where: Prisma.BrandWhereInput = {
      isActive: true,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    };
    const skip = (page - 1) * limit;
    const [totalItems, brands] = await db.$transaction([
      db.brand.count({ where }),
      db.brand.findMany({
        where,
        skip,
        take: limit,
      select: { id: true, name: true, slug: true, description: true, logoUrl: true },
      orderBy: { name: "asc" },
      }),
    ]);
    const result = {
      brands,
      pagination: { totalItems, totalPages: Math.ceil(totalItems / limit), currentPage: page, limit },
    };
    await CatalogCache.set(key, result, this.LOOKUP_CACHE_TTL_SECONDS);
    return result;
  }

  static async getCategories(query: LookupQuery) {
    const { page, limit, q, parentId } = query;
    const key = `categories:${page}:${limit}:${parentId ?? "root"}:${q ?? ""}`;
    const cached = await CatalogCache.get<{
      categories: unknown[];
      pagination: { totalItems: number; totalPages: number; currentPage: number; limit: number };
    }>(key);
    if (cached) return cached;

    const where: Prisma.CategoryWhereInput = {
      isActive: true,
      parentId: parentId ?? null,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    };
    const skip = (page - 1) * limit;
    const [totalItems, categories] = await db.$transaction([
      db.category.count({ where }),
      db.category.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          parentId: true,
          _count: { select: { children: true, products: true } },
        },
        orderBy: { name: "asc" },
      }),
    ]);
    const result = {
      categories,
      pagination: { totalItems, totalPages: Math.ceil(totalItems / limit), currentPage: page, limit },
    };
    await CatalogCache.set(key, result, this.LOOKUP_CACHE_TTL_SECONDS);
    return result;
  }

  static async getBrandBySlug(slug: string) {
    const key = `brand:${slug}`;
    const cached = await CatalogCache.get<unknown>(key);
    if (cached) return cached;
    const brand = await db.brand.findFirst({
      where: { slug, isActive: true },
      include: { _count: { select: { products: true } } },
    });
    if (brand) await CatalogCache.set(key, brand, this.LOOKUP_CACHE_TTL_SECONDS);
    return brand;
  }

  static async getCategoryBySlug(slug: string) {
    const key = `category:${slug}`;
    const cached = await CatalogCache.get<unknown>(key);
    if (cached) return cached;
    const category = await db.category.findFirst({
      where: { slug, isActive: true },
      include: {
        parent: { select: { id: true, name: true, slug: true, parentId: true } },
        _count: { select: { children: true, products: true } },
      },
    });
    if (category) await CatalogCache.set(key, category, this.LOOKUP_CACHE_TTL_SECONDS);
    return category;
  }

  static async getProductReviewStats(productId: string) {
    const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) return null;
    return db.productReviewStats.findUnique({
      where: { productId },
      select: { productId: true, averageRating: true, reviewCount: true, updatedAt: true },
    });
  }

  static async getProductById(id: string) {
    return db.product.findUnique({
      where: { id },
      include: { images: true },
    });
  }

  static async getProductBySlug(slug: string) {
    const key = `pdp:${slug}`;
    const cached = await CatalogCache.get<{
      id: string;
      variants: Array<{ id: string }>;
      [key: string]: unknown;
    }>(key);
    const product = cached ?? await db.product.findUnique({
      where: { slug },
      include: {
        brandRef: { select: { id: true, name: true, slug: true, logoUrl: true } },
        categoryRef: { select: { id: true, name: true, slug: true, parentId: true } },
        images: { orderBy: { createdAt: "asc" } },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            sku: true,
            price: true,
            size: true,
            color: true,
            attributes: true,
            isActive: true,
          },
          orderBy: { sku: "asc" },
        },
        reviewStats: true,
      },
    });

    if (!product) return null;
    if (!cached) await CatalogCache.set(key, product, this.PDP_CACHE_TTL_SECONDS);

    const variantIds = product.variants.map((variant: { id: string }) => variant.id);
    const stock = variantIds.length
      ? await db.inventory.findMany({
          where: { variantId: { in: variantIds } },
          select: {
            variantId: true,
            quantityInStock: true,
            reserved: true,
            storeId: true,
            updatedAt: true,
          },
        })
      : [];
    const stockByVariant = new Map(stock.map((inventory) => [inventory.variantId, inventory]));

    return {
      ...product,
      variants: product.variants.map((variant: { id: string }) => {
        const inventory = stockByVariant.get(variant.id) ?? null;
        return {
          ...variant,
          inventory: inventory
            ? {
                ...inventory,
                availableQuantity: Math.max(0, inventory.quantityInStock - inventory.reserved),
              }
            : null,
        };
      }),
    };
  }

  static async getProducts(query: GetProductsQuery) {
    const cacheKey = `products:${createHash("sha256").update(JSON.stringify(query)).digest("hex")}`;
    const cached = await CatalogCache.get<Awaited<ReturnType<typeof this.queryProducts>>>(cacheKey);
    if (cached) return cached;
    const result = await this.queryProducts(query);
    await CatalogCache.set(cacheKey, result, 30);
    return result;
  }

  private static async queryProducts(query: GetProductsQuery) {
    const { page, limit, size, color, category, brand, minPrice, maxPrice } = query;

    // Build the dynamic where condition
    const whereConditions: Prisma.ProductWhereInput[] = [];

    // Filter by Brand (Case-insensitive matching across multiple items)
    if (brand && brand.length > 0) {
      whereConditions.push({
        brand: {
          in: brand,
          mode: "insensitive",
        },
      });
    }

    // Filter by Category
    if (category && category.length > 0) {
      whereConditions.push({
        category: {
          in: category,
          mode: "insensitive",
        },
      });
    }

    // Filter by Sizes (PostgreSQL array containment: sizes hasSome [...])
    if (size && size.length > 0) {
      whereConditions.push({
        sizes: {
          hasSome: size,
        },
      });
    }

    // Filter by Colors (PostgreSQL array containment: colors hasSome [...])
    if (color && color.length > 0) {
      whereConditions.push({
        colors: {
          hasSome: color,
        },
      });
    }

    // Filter by Price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      whereConditions.push({
        price: {
          ...(minPrice !== undefined ? { gte: minPrice } : {}),
          ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
        },
      });
    }

    const where: Prisma.ProductWhereInput =
      whereConditions.length > 0 ? { AND: whereConditions } : {};

    // Offset-based pagination calculation
    const skip = (page - 1) * limit;

    // Run count and query in parallel
    const [totalItems, products] = await db.$transaction([
      db.product.count({ where }),
      db.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);
  // console.log("products=", JSON.stringify(products))
    const totalPages = Math.ceil(totalItems / limit);

    return {
      products,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
      },
    };
  }

  static async createProduct(data: CreateProductInput) {
    const {
      title,
      description,
      brand,
      category,
      price,
      imageUrl,
      sizes,
      colors,
      inStock,
      galleryImages,
    } = data;

    const [brandRecord, categoryRecord] = await Promise.all([
      this.resolveBrand(brand),
      this.resolveCategory(category),
    ]);
    const id = randomUUID();
    const productSlug = data.slug?.trim() || `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product"}-${id.slice(0, 8)}`;

    const newProduct = await db.product.create({
      data: {
        id,
        slug: productSlug,
        title,
        description,
        brand,
        brandRef: { connect: { id: brandRecord.id } },
        category,
        categoryRef: { connect: { id: categoryRecord.id } },
        specs: (data.specs ?? {}) as Prisma.InputJsonValue,
        price,
        imageUrl,
        sizes,
        colors,
        inStock,
        images: {
          create: galleryImages.map((img) => ({
            url: img.url,
            altText: img.altText || title,
          })),
        },
        variants: {
          create: sizes.flatMap((size) =>
            colors.map((color) => ({
              sku: `${id}-${size}-${color}-${randomUUID().slice(0, 8)}`
                .toLowerCase()
                .replace(/[^a-z0-9-]+/g, "-"),
              price: new Prisma.Decimal(price),
              size,
              color,
              attributes: { size, color },
            }))
          ),
        },
        reviewStats: { create: { averageRating: 0, reviewCount: 0 } },
      },
      include: {
        images: true, // Includes the related ProductImage objects in the response
        variants: true,
      },
    });

    // Generate and store embedding.
  // WILL ENABLE LATER ON PRODUCTION 
    try {
  const textToEmbed = `${newProduct.title} ${newProduct.brand} ${newProduct.category} ${newProduct.description}`;
  const vector = await SemanticSearchStrategy.generateEmbedding(textToEmbed);
  const vectorString = `[${vector.join(",")}]`;

  await db.$executeRawUnsafe(
    `UPDATE "products" SET embedding = $1::vector WHERE id = $2`,
    vectorString,
    newProduct.id
  );
} catch (error) {
  console.error("Failed to generate embedding at product creation:", error);
}

await CatalogCache.invalidate();
return newProduct;
  }

  static async updateProduct(id: string, data: UpdateProductInput) {
    const {
      title,
      slug,
      specs,
      description,
      brand,
      category,
      price,
      imageUrl,
      sizes,
      colors,
      inStock,
      galleryImages,
      replaceGallery,
    } = data;

    // 1. Check if the product exists
    const existingProduct = await db.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingProduct) {
      const error: any = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }

    // 2. Build the atomic update payload
    const updateData: Prisma.ProductUpdateInput = {};

    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (brand !== undefined) {
      const brandRecord = await this.resolveBrand(brand);
      updateData.brand = brand;
      updateData.brandRef = { connect: { id: brandRecord.id } };
    }
    if (category !== undefined) {
      const categoryRecord = await this.resolveCategory(category);
      updateData.category = category;
      updateData.categoryRef = { connect: { id: categoryRecord.id } };
    }
    if (specs !== undefined) updateData.specs = specs as Prisma.InputJsonValue;
    if (price !== undefined) updateData.price = new Prisma.Decimal(price);
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (sizes !== undefined) updateData.sizes = sizes;
    if (colors !== undefined) updateData.colors = colors;
    if (inStock !== undefined) updateData.inStock = inStock;

    // 3. Handle gallery images relation if supplied
    if (galleryImages && galleryImages.length > 0) {
      if (replaceGallery) {
        // Delete all old images, then add the new list
        updateData.images = {
          deleteMany: {},
          create: galleryImages.map((img) => ({
            url: img.url,
            altText: img.altText || title || "Product image",
          })),
        };
      } else {
        // Append new images to the existing gallery
        updateData.images = {
          create: galleryImages.map((img) => ({
            url: img.url,
            altText: img.altText || title || "Product image",
          })),
        };
      }
    }

    // 4. Execute atomic update
    const updated = await db.product.update({
      where: { id },
      data: updateData,
      include: {
        images: true,
      },
    });
    await CatalogCache.invalidate();
    return updated;
  }

  static async deleteProduct(id: string) {
    // 1. Verify existence before deletion
    const existing = await db.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      const error: any = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }

    // 2. Cascade delete product (ProductImage & Inventory cascade automatically via schema relation onDelete: Cascade)
    await db.product.delete({
      where: { id },
    });

    await CatalogCache.invalidate();
    return {
      message: "Product deleted successfully",
      id,
    };
  }

  static async createProductVariant(productId: string, data: CreateProductVariantInput) {
    const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) {
      const error: any = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }
    const variant = await db.productVariant.create({
      data: {
        productId,
        sku: data.sku,
        price: new Prisma.Decimal(data.price),
        size: data.size,
        color: data.color,
        attributes: data.attributes as Prisma.InputJsonValue,
      },
    });
    await CatalogCache.invalidate();
    return variant;
  }
   
}