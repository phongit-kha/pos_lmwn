import Decimal from "decimal.js";
import type {
  OrderItem,
  OrderWithItems,
  OrderResponse,
  OrderItemResponse,
  OrderListItem,
} from "@/server/types";
import { calculateItemTotal } from "@/server/services/calculation.service";

/**
 * Transform OrderItem to API response format
 */
export function transformOrderItem(item: OrderItem): OrderItemResponse {
  const priceDecimal = new Decimal(item.pricePerUnit.toString());
  const itemTotal = calculateItemTotal(priceDecimal, item.quantity);

  return {
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    pricePerUnit: priceDecimal.toFixed(2),
    quantity: item.quantity,
    batchSequence: item.batchSequence,
    status: item.status,
    voidReason: item.voidReason,
    itemTotal: itemTotal.toFixed(2),
  };
}

/**
 * Transform Order with items to API response format
 */
export function transformOrder(order: OrderWithItems): OrderResponse {
  return {
    id: order.id,
    tableNumber: order.tableNumber,
    status: order.status,
    subtotal: new Decimal(order.subtotal.toString()).toFixed(2),
    discountType: order.discountType,
    discountValue: order.discountValue
      ? new Decimal(order.discountValue.toString()).toFixed(2)
      : null,
    grandTotal: new Decimal(order.grandTotal.toString()).toFixed(2),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map(transformOrderItem),
  };
}

/**
 * Transform Order to list item format
 */
export function transformOrderListItem(order: OrderWithItems): OrderListItem {
  const activeItems = order.items.filter((item) => item.status === "ACTIVE");
  return {
    id: order.id,
    tableNumber: order.tableNumber,
    status: order.status,
    grandTotal: new Decimal(order.grandTotal.toString()).toFixed(2),
    itemCount: activeItems.length,
    createdAt: order.createdAt.toISOString(),
  };
}
