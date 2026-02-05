import { z } from "zod";

/**
 * Schema for creating a new order item
 */
export const orderItemInputSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
});

/**
 * Schema for creating a new order
 */
export const createOrderSchema = z.object({
  tableNumber: z.number().int().positive("Table number must be a positive integer"),
  items: z
    .array(orderItemInputSchema)
    .min(1, "At least 1 item is required"),
});

/**
 * Schema for adding items to an existing order
 */
export const addItemsSchema = z.object({
  items: z
    .array(orderItemInputSchema)
    .min(1, "At least 1 item is required"),
});

/**
 * Schema for voiding an order item
 */
export const voidItemSchema = z.object({
  reason: z.string().min(1, "Void reason is required").max(500, "Reason is too long"),
});

/**
 * Schema for updating item quantity
 */
export const updateItemQuantitySchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(999, "Quantity cannot exceed 999"),
});

/**
 * Schema for checkout
 * - PERCENT: discount value is 0-100 (percentage)
 * - FIXED: discount value is in satang (1 baht = 100 satang)
 */
export const checkoutSchema = z.object({
  discountType: z.enum(["PERCENT", "FIXED"]).optional(),
  discountValue: z
    .number()
    .nonnegative("Discount value must be non-negative")
    .optional(),
}).refine(
  (data) => {
    // If discountType is provided, discountValue must also be provided
    if (data.discountType && data.discountValue === undefined) {
      return false;
    }
    // If PERCENT, value must be 0-100
    if (data.discountType === "PERCENT" && data.discountValue !== undefined) {
      return data.discountValue >= 0 && data.discountValue <= 100;
    }
    // If FIXED, value should be an integer (satang)
    if (data.discountType === "FIXED" && data.discountValue !== undefined) {
      return Number.isInteger(data.discountValue);
    }
    return true;
  },
  {
    message: "Invalid discount configuration. Percentage must be 0-100, FIXED must be integer (satang), and value is required when type is specified.",
  }
);

/**
 * Schema for order list filters
 */
export const orderListFilterSchema = z.object({
  status: z.enum(["OPEN", "CONFIRMED", "PAID", "CANCELLED"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  tableNumber: z.coerce.number().int().positive().optional(),
}).refine(
  (data) => {
    // If both dates provided, startDate must be before endDate
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: "Start date must be before end date",
  }
);

/**
 * Schema for sales report filters
 */
export const salesReportFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: "Start date must be before end date",
  }
);

// Type exports
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type AddItemsInput = z.infer<typeof addItemsSchema>;
export type VoidItemInput = z.infer<typeof voidItemSchema>;
export type UpdateItemQuantityInput = z.infer<typeof updateItemQuantitySchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type OrderListFilter = z.infer<typeof orderListFilterSchema>;
export type SalesReportFilter = z.infer<typeof salesReportFilterSchema>;
