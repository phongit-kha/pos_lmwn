import { z } from "zod";

/**
 * Schema for creating a new product
 * Price is in satang (1 baht = 100 satang)
 * Example: 89 baht = 8900 satang
 */
export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required").max(200, "Name is too long"),
  price: z
    .number()
    .int("Price must be an integer (in satang)")
    .positive("Price must be positive"),
  category: z.string().min(1, "Category is required").max(100, "Category is too long"),
  isActive: z.boolean().default(true),
});

/**
 * Schema for updating a product
 * Price is in satang (1 baht = 100 satang)
 */
export const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  price: z.number().int("Price must be an integer (in satang)").positive().optional(),
  category: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

/**
 * Schema for product list filters
 */
export const productListFilterSchema = z.object({
  category: z.string().optional(),
  isActive: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  search: z.string().optional(),
});

// Type exports
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductListFilter = z.infer<typeof productListFilterSchema>;
