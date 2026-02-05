import type {
  OrderItem,
  OrderWithItems,
  OrderResponse,
  OrderItemResponse,
  OrderListItem,
  Product,
  ProductListItem,
} from "@/server/types";
import { calculateItemTotal, toBigInt } from "@/server/services/calculation.service";

// ==========================================
// BigInt to String Helper
// ==========================================

/**
 * Convert BigInt to string for API response
 * Handles both bigint and Prisma Decimal types
 */
function toStringValue(value: bigint | { toString(): string }): string {
  return value.toString();
}

// ==========================================
// Order Item Transformers
// ==========================================

/**
 * Transform OrderItem to API response format (Detail View)
 * All monetary values are in satang (integers)
 */
export function transformOrderItem(item: OrderItem): OrderItemResponse {
  const pricePerUnit = toBigInt(item.pricePerUnit);
  const itemTotal = calculateItemTotal(pricePerUnit, item.quantity);

  return {
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    pricePerUnit: toStringValue(item.pricePerUnit),
    quantity: item.quantity,
    batchSequence: item.batchSequence,
    status: item.status,
    voidReason: item.voidReason,
    itemTotal: itemTotal.toString(),
  };
}

// ==========================================
// Order Transformers - Detail View
// ==========================================

/**
 * Transform Order with items to API response format (Detail View)
 * Use this when returning a single order with full details
 * All monetary values are in satang (integers)
 */
export function transformOrder(order: OrderWithItems): OrderResponse {
  return {
    id: order.id,
    tableNumber: order.tableNumber,
    status: order.status,
    subtotal: toStringValue(order.subtotal),
    discountType: order.discountType,
    discountValue: order.discountValue
      ? toStringValue(order.discountValue)
      : null,
    grandTotal: toStringValue(order.grandTotal),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map(transformOrderItem),
  };
}

// ==========================================
// Order Transformers - List View (Lean)
// ==========================================

/**
 * Transform Order to list item format (List View)
 * Use this when returning a list of orders - minimal data for efficiency
 * All monetary values are in satang (integers)
 */
export function transformOrderListItem(order: OrderWithItems): OrderListItem {
  const activeItems = order.items.filter((item) => item.status === "ACTIVE");
  return {
    id: order.id,
    tableNumber: order.tableNumber,
    status: order.status,
    grandTotal: toStringValue(order.grandTotal),
    itemCount: activeItems.length,
    createdAt: order.createdAt.toISOString(),
  };
}

/**
 * Transform Order with _count to list item format
 * More efficient version that uses Prisma's _count instead of loading items
 */
export function transformOrderListItemWithCount(
  order: Omit<OrderWithItems, "items"> & { _count: { items: number } }
): OrderListItem {
  return {
    id: order.id,
    tableNumber: order.tableNumber,
    status: order.status,
    grandTotal: toStringValue(order.grandTotal),
    itemCount: order._count.items,
    createdAt: order.createdAt.toISOString(),
  };
}

// ==========================================
// Product Transformers
// ==========================================

/**
 * Transform Product to list item format (List View)
 * Use this when returning a list of products - minimal data for efficiency
 * All monetary values are in satang (integers)
 */
export function transformProductListItem(product: Product): ProductListItem {
  return {
    id: product.id,
    name: product.name,
    price: toStringValue(product.price),
    category: product.category,
    isActive: product.isActive,
  };
}

/**
 * Transform Product to full response format (Detail View)
 * Use this when returning a single product with full details
 */
export function transformProduct(product: Product) {
  return {
    id: product.id,
    name: product.name,
    price: toStringValue(product.price),
    category: product.category,
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
