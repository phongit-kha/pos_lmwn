import { db } from "@/server/db";
import type { Product } from "@/server/types";
import { NotFoundError } from "@/server/types";
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductListFilter,
} from "@/server/validators/product.validator";

/**
 * Create a new product
 */
export async function createProduct(input: CreateProductInput): Promise<Product> {
  const product = await db.product.create({
    data: {
      name: input.name,
      price: input.price,
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
    throw new NotFoundError("Product");
  }

  const product = await db.product.update({
    where: { id },
    data: input,
  });

  return product;
}

/**
 * List products with optional filters
 */
export async function listProducts(filters?: ProductListFilter): Promise<Product[]> {
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

  return db.product.findMany({
    where,
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

/**
 * Delete a product (soft delete by setting isActive to false)
 */
export async function deleteProduct(id: string): Promise<Product> {
  const existing = await getProductById(id);
  if (!existing) {
    throw new NotFoundError("Product");
  }

  return db.product.update({
    where: { id },
    data: { isActive: false },
  });
}
