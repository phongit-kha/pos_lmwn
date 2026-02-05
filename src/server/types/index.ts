import type {
  Order as PrismaOrder,
  OrderItem as PrismaOrderItem,
  Product as PrismaProduct,
  OrderLog as PrismaOrderLog,
  OrderStatus,
  OrderItemStatus,
} from "../../../generated/prisma";

// Re-export Prisma types
export type { OrderStatus, OrderItemStatus };

// Re-export Prisma models
export type Product = PrismaProduct;
export type Order = PrismaOrder;
export type OrderItem = PrismaOrderItem;
export type OrderLog = PrismaOrderLog;

// ==========================================
// Order Relations
// ==========================================

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface OrderWithItemsAndLogs extends OrderWithItems {
  logs: OrderLog[];
}

// ==========================================
// Discount Types
// ==========================================

export type DiscountType = "PERCENT" | "FIXED";

// ==========================================
// DTOs for API Requests
// ==========================================

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
}

export interface CreateOrderInput {
  tableNumber: number;
  items: CreateOrderItemInput[];
}

export interface AddItemsInput {
  items: CreateOrderItemInput[];
}

export interface VoidItemInput {
  reason: string;
}

export interface CheckoutInput {
  discountType?: DiscountType;
  discountValue?: number; // Whole percentage for PERCENT, satang for FIXED
}

// ==========================================
// DTOs for API Responses - Detail View
// ==========================================

export interface OrderItemResponse {
  id: string;
  productId: string;
  productName: string;
  pricePerUnit: string; // satang as string
  quantity: number;
  batchSequence: number;
  status: OrderItemStatus;
  voidReason: string | null;
  itemTotal: string; // satang as string
}

export interface OrderResponse {
  id: string;
  tableNumber: number;
  status: OrderStatus;
  subtotal: string; // satang as string
  discountType: string | null;
  discountValue: string | null; // satang or percentage as string
  grandTotal: string; // satang as string
  createdAt: string;
  updatedAt: string;
  items: OrderItemResponse[];
}

// ==========================================
// DTOs for API Responses - List View (Lean)
// ==========================================

export interface OrderListItem {
  id: string;
  tableNumber: number;
  status: OrderStatus;
  grandTotal: string; // satang as string
  itemCount: number; // Only count, not full items
  createdAt: string;
}

export interface ProductListItem {
  id: string;
  name: string;
  price: string; // satang as string
  category: string;
  isActive: boolean;
  // NO timestamps for list view
}

// ==========================================
// Pagination Types
// ==========================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ==========================================
// Sales Report Types
// ==========================================

export interface SalesReportFilter {
  startDate?: Date;
  endDate?: Date;
}

export interface SalesReportItem {
  date: string;
  orderCount: number;
  totalSales: string; // satang as string
  totalDiscount: string; // satang as string
  netSales: string; // satang as string
}

export interface SalesReport {
  summary: {
    totalOrders: number;
    totalSales: string;
    totalDiscount: string;
    netSales: string;
  };
  dailyBreakdown: SalesReportItem[];
}

// ==========================================
// Calculation Service Types
// ==========================================

export interface CalculationItem {
  pricePerUnit: bigint | string | number;
  quantity: number;
  status: OrderItemStatus;
}

// ==========================================
// Order Filters
// ==========================================

export interface OrderFilters extends PaginationParams {
  status?: OrderStatus;
  tableNumber?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface ProductFilters extends PaginationParams {
  category?: string;
  isActive?: boolean;
  search?: string;
}

// ==========================================
// Error Types (re-exported from errors.ts)
// ==========================================

export {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  InvalidStateError,
  ErrorCode,
  ErrorMessage,
  Errors,
} from "@/server/lib/errors";
export type { ErrorCodeType } from "@/server/lib/errors";
