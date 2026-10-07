// src/modules/catalog/catalog.service.ts
import { Prisma } from "@prisma/client";
import { db } from "../../core/database";
import { CreateProductInput, GetProductsQuery , UpdateProductInput } from "./catalog.schema";

export class CatalogService {
  static async getProducts(query: GetProductsQuery) {
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

    const newProduct = await db.product.create({
      data: {
        title,
        description,
        brand,
        category,
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
      },
      include: {
        images: true, // Includes the related ProductImage objects in the response
      },
    });

    return newProduct;
  }

  static async updateProduct(id: string, data: UpdateProductInput) {
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
    if (description !== undefined) updateData.description = description;
    if (brand !== undefined) updateData.brand = brand;
    if (category !== undefined) updateData.category = category;
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
    return db.product.update({
      where: { id },
      data: updateData,
      include: {
        images: true,
      },
    });
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

    return {
      message: "Product deleted successfully",
      id,
    };
  }
   
}