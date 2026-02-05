import { db } from "@/server/db";
import type { Product, ProductFilters, PaginatedResponse } from "@/server/types";
import { NotFoundError } from "@/server/types";
import type {
  CreateProductInput,
  UpdateProductInput,
} from "@/server/validators/product.validator";

/**
 * Create a new product
 */
export async function createProduct(input: CreateProductInput): Promise<Product> {
  const product = await db.product.create({
    data: {
      name: input.name,
      price: BigInt(input.price), // Convert to BigInt for satang storage
      category: input.category,
      isActive: input.isActive ?? true,
    },
  });

  return product;
}

/**
 * Get product by ID
 */
export async function getProductById(id: string): Promise<Product | null> {
  return db.product.findUnique({
    where: { id },
  });
}

/**
 * Update a product
 */
export async function updateProduct(
  id: string,
  input: UpdateProductInput
): Promise<Product> {
  const existing = await getProductById(id);
  if (!existing) {
    throw new NotFoundError("Product", id);
  }

  const updateData: Record<string, unknown> = {};
  
  if (input.name !== undefined) updateData.name = input.name;
  if (input.price !== undefined) updateData.price = BigInt(input.price);
  if (input.category !== undefined) updateData.category = input.category;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  const product = await db.product.update({
    where: { id },
    data: updateData,
  });

  return product;
}

/**
 * List products with optional filters and pagination
 * Returns paginated response with lean product items
 */
export async function listProducts(
  filters?: ProductFilters
): Promise<PaginatedResponse<Product>> {
  const page = filters?.page ?? 1;
  const limit = Math.min(filters?.limit ?? 20, 100); // Max 100 per page
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (filters?.category) {
    where.category = filters.category;
  }

  if (filters?.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (filters?.search) {
    where.name = {
      contains: filters.search,
      mode: "insensitive",
    };
  }

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
      skip,
      take: limit,
    }),
    db.product.count({ where }),
  ]);

  return {
    data: products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

/**
 * List all active products (for menu display, no pagination)
 */
export async function listActiveProducts(): Promise<Product[]> {
  return db.product.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

/**
 * Delete a product (soft delete by setting isActive to false)
 */
export async function deleteProduct(id: string): Promise<Product> {
  const existing = await getProductById(id);
  if (!existing) {
    throw new NotFoundError("Product", id);
  }

  return db.product.update({
    where: { id },
    data: { isActive: false },
  });
}

/**
 * Get products by IDs (for order creation)
 */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  return db.product.findMany({
    where: {
      id: { in: ids },
      isActive: true,
    },
  });
}
