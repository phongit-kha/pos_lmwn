import type { Decimal } from "decimal.js";
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

// Order with relations
export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface OrderWithItemsAndLogs extends OrderWithItems {
  logs: OrderLog[];
}

// Discount types
export type DiscountType = "PERCENT" | "FIXED";

// DTOs for API requests
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
  discountValue?: number;
}

// DTOs for API responses
export interface OrderItemResponse {
  id: string;
  productId: string;
  productName: string;
  pricePerUnit: string;
  quantity: number;
  batchSequence: number;
  status: OrderItemStatus;
  voidReason: string | null;
  itemTotal: string;
}

export interface OrderResponse {
  id: string;
  tableNumber: number;
  status: OrderStatus;
  subtotal: string;
  discountType: string | null;
  discountValue: string | null;
  grandTotal: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItemResponse[];
}

export interface OrderListItem {
  id: string;
  tableNumber: number;
  status: OrderStatus;
  grandTotal: string;
  itemCount: number;
  createdAt: string;
}

// Sales report types
export interface SalesReportFilter {
  startDate?: Date;
  endDate?: Date;
}

export interface SalesReportItem {
  date: string;
  orderCount: number;
  totalSales: string;
  totalDiscount: string;
  netSales: string;
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

// Calculation service types
export interface CalculationItem {
  pricePerUnit: Decimal | string | number;
  quantity: number;
  status: OrderItemStatus;
}

// Error types
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, "CONFLICT");
    this.name = "ConflictError";
  }
}

export class InvalidStateError extends AppError {
  constructor(message: string) {
    super(400, message, "INVALID_STATE");
    this.name = "InvalidStateError";
  }
}
