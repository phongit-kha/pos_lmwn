import { z } from "zod";

// ==========================================
// Pagination Validators
// ==========================================

/**
 * Pagination query parameters schema
 * - page: Page number (default: 1, min: 1)
 * - limit: Items per page (default: 20, min: 1, max: 100)
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * Parse pagination from URL search params
 */
export function parsePagination(searchParams: URLSearchParams): PaginationInput {
  return paginationSchema.parse({
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
}

// ==========================================
// Date Range Validators
// ==========================================

/**
 * Date range query parameters schema
 * - startDate: Start of range (optional)
 * - endDate: End of range (optional)
 */
export const dateRangeSchema = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: "Start date must be before or equal to end date",
      path: ["startDate"],
    }
  );

export type DateRangeInput = z.infer<typeof dateRangeSchema>;

/**
 * Parse date range from URL search params
 */
export function parseDateRange(searchParams: URLSearchParams): DateRangeInput {
  return dateRangeSchema.parse({
    startDate: searchParams.get("startDate") ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined,
  });
}

// ==========================================
// Combined Filter Validators
// ==========================================

/**
 * Order list filter schema with pagination
 */
export const orderFilterSchema = z.object({
  status: z.enum(["OPEN", "CONFIRMED", "PAID", "CANCELLED"]).optional(),
  tableNumber: z.coerce.number().int().min(1).max(999).optional(),
  ...paginationSchema.shape,
  ...dateRangeSchema.innerType().shape,
});

export type OrderFilterInput = z.infer<typeof orderFilterSchema>;

/**
 * Parse order filters from URL search params
 */
export function parseOrderFilters(searchParams: URLSearchParams): OrderFilterInput {
  return orderFilterSchema.parse({
    status: searchParams.get("status") ?? undefined,
    tableNumber: searchParams.get("tableNumber") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    startDate: searchParams.get("startDate") ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined,
  });
}

/**
 * Product list filter schema with pagination
 */
export const productFilterSchema = z.object({
  category: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
  ...paginationSchema.shape,
});

export type ProductFilterInput = z.infer<typeof productFilterSchema>;

/**
 * Parse product filters from URL search params
 */
export function parseProductFilters(searchParams: URLSearchParams): ProductFilterInput {
  return productFilterSchema.parse({
    category: searchParams.get("category") ?? undefined,
    isActive: searchParams.get("isActive") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
}
