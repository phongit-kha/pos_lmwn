import Decimal from "decimal.js";
import { db } from "@/server/db";
import {
  recalculateOrderTotals,
  toDecimalString,
} from "@/server/services/calculation.service";
import type {
  OrderStatus,
  OrderItemStatus,
  OrderWithItems,
  OrderWithItemsAndLogs,
  CreateOrderInput,
  AddItemsInput,
  VoidItemInput,
  CheckoutInput,
  OrderItem,
} from "@/server/types";
import {
  NotFoundError,
  InvalidStateError,
  ValidationError,
} from "@/server/types";

// ============================================
// Order Actions Enum
// ============================================
export const OrderAction = {
  CREATE: "CREATE",
  ADD_ITEMS: "ADD_ITEMS",
  CONFIRM: "CONFIRM",
  VOID_ITEM: "VOID_ITEM",
  CHECKOUT: "CHECKOUT",
  CANCEL: "CANCEL",
} as const;

export type OrderActionType = (typeof OrderAction)[keyof typeof OrderAction];

// ============================================
// State Machine - Valid Transitions
// ============================================
const STATE_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  OPEN: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PAID", "CANCELLED"],
  PAID: [], // Terminal state
  CANCELLED: [], // Terminal state
};

/**
 * Validate if a state transition is allowed
 */
export function validateStateTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): boolean {
  const allowedTransitions = STATE_TRANSITIONS[currentStatus];
  return allowedTransitions?.includes(newStatus) ?? false;
}

/**
 * Check if items can be added to the order
 * Allowed in OPEN and CONFIRMED states
 */
export function canAddItems(status: OrderStatus): boolean {
  return status === "OPEN" || status === "CONFIRMED";
}

/**
 * Check if items can be modified (edited/deleted)
 * Only allowed in OPEN state
 */
export function canModifyItems(status: OrderStatus): boolean {
  return status === "OPEN";
}

/**
 * Check if items can be voided
 * Only allowed in CONFIRMED state (soft delete with reason)
 */
export function canVoidItem(status: OrderStatus): boolean {
  return status === "CONFIRMED";
}

/**
 * Check if order can proceed to checkout
 * Only allowed in CONFIRMED state
 */
export function canCheckout(status: OrderStatus): boolean {
  return status === "CONFIRMED";
}

/**
 * Check if order can be cancelled
 * Allowed in OPEN and CONFIRMED states (not in PAID)
 */
export function canCancel(status: OrderStatus): boolean {
  return status === "OPEN" || status === "CONFIRMED";
}

/**
 * Get the next batch sequence for new items
 */
export function getNextBatchSequence(
  items: Pick<OrderItem, "batchSequence">[]
): number {
  if (items.length === 0) return 1;
  const maxBatch = Math.max(...items.map((item) => item.batchSequence));
  return maxBatch + 1;
}

// ============================================
// Order Operations
// ============================================

/**
 * Create a new order with initial items
 */
export async function createOrder(
  input: CreateOrderInput
): Promise<OrderWithItems> {
  const { tableNumber, items: itemsInput } = input;

  // Fetch all products in one query
  const productIds = itemsInput.map((item) => item.productId);
  const products = await db.product.findMany({
    where: {
      id: { in: productIds },
      isActive: true,
    },
  });

  // Validate all products exist
  const productMap = new Map(products.map((p) => [p.id, p]));
  for (const item of itemsInput) {
    if (!productMap.has(item.productId)) {
      throw new NotFoundError(`Product ${item.productId}`);
    }
  }

  // Create order with items in a transaction
  const order = await db.$transaction(async (tx) => {
    // Create the order
    const newOrder = await tx.order.create({
      data: {
        tableNumber,
        status: "OPEN",
        subtotal: 0,
        grandTotal: 0,
      },
    });

    // Create order items with frozen prices
    const orderItems = itemsInput.map((item) => {
      const product = productMap.get(item.productId)!;
      return {
        orderId: newOrder.id,
        productId: product.id,
        productName: product.name,
        pricePerUnit: product.price,
        quantity: item.quantity,
        batchSequence: 1,
        status: "ACTIVE" as OrderItemStatus,
      };
    });

    await tx.orderItem.createMany({
      data: orderItems,
    });

    // Fetch created items
    const createdItems = await tx.orderItem.findMany({
      where: { orderId: newOrder.id },
    });

    // Calculate totals
    const { subtotal, grandTotal } = recalculateOrderTotals(
      createdItems.map((item) => ({
        pricePerUnit: item.pricePerUnit,
        quantity: item.quantity,
        status: item.status,
      })),
      null,
      null
    );

    // Update order with calculated totals
    const updatedOrder = await tx.order.update({
      where: { id: newOrder.id },
      data: {
        subtotal: toDecimalString(subtotal),
        grandTotal: toDecimalString(grandTotal),
      },
      include: { items: true },
    });

    // Create audit log
    await tx.orderLog.create({
      data: {
        orderId: newOrder.id,
        action: OrderAction.CREATE,
        details: {
          tableNumber,
          itemCount: itemsInput.length,
          subtotal: toDecimalString(subtotal),
        },
      },
    });

    return updatedOrder;
  });

  return order;
}

/**
 * Add items to an existing order (batch ordering)
 */
export async function addItemsToOrder(
  orderId: string,
  input: AddItemsInput
): Promise<OrderWithItems> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new NotFoundError("Order");
  }

  if (!canAddItems(order.status)) {
    throw new InvalidStateError(
      `Cannot add items to order in ${order.status} state`
    );
  }

  const { items: itemsInput } = input;

  // Fetch all products
  const productIds = itemsInput.map((item) => item.productId);
  const products = await db.product.findMany({
    where: {
      id: { in: productIds },
      isActive: true,
    },
  });

  // Validate all products exist
  const productMap = new Map(products.map((p) => [p.id, p]));
  for (const item of itemsInput) {
    if (!productMap.has(item.productId)) {
      throw new NotFoundError(`Product ${item.productId}`);
    }
  }

  // Get next batch sequence
  const nextBatch = getNextBatchSequence(order.items);

  const updatedOrder = await db.$transaction(async (tx) => {
    // Create new order items with frozen prices
    const orderItems = itemsInput.map((item) => {
      const product = productMap.get(item.productId)!;
      return {
        orderId: order.id,
        productId: product.id,
        productName: product.name,
        pricePerUnit: product.price,
        quantity: item.quantity,
        batchSequence: nextBatch,
        status: "ACTIVE" as OrderItemStatus,
      };
    });

    await tx.orderItem.createMany({
      data: orderItems,
    });

    // Fetch all items
    const allItems = await tx.orderItem.findMany({
      where: { orderId: order.id },
    });

    // Recalculate totals
    const { subtotal, grandTotal } = recalculateOrderTotals(
      allItems.map((item) => ({
        pricePerUnit: item.pricePerUnit,
        quantity: item.quantity,
        status: item.status,
      })),
      order.discountType,
      order.discountValue
    );

    // Update order totals
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        subtotal: toDecimalString(subtotal),
        grandTotal: toDecimalString(grandTotal),
      },
      include: { items: true },
    });

    // Create audit log
    await tx.orderLog.create({
      data: {
        orderId: order.id,
        action: OrderAction.ADD_ITEMS,
        details: {
          batchSequence: nextBatch,
          itemCount: itemsInput.length,
          newSubtotal: toDecimalString(subtotal),
        },
      },
    });

    return updated;
  });

  return updatedOrder;
}

/**
 * Confirm an order (send to kitchen)
 */
export async function confirmOrder(orderId: string): Promise<OrderWithItems> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new NotFoundError("Order");
  }

  if (!validateStateTransition(order.status, "CONFIRMED")) {
    throw new InvalidStateError(
      `Cannot confirm order in ${order.status} state`
    );
  }

  // Check if there are any active items
  const activeItems = order.items.filter((item) => item.status === "ACTIVE");
  if (activeItems.length === 0) {
    throw new ValidationError("Cannot confirm order with no active items");
  }

  const updatedOrder = await db.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: "CONFIRMED" },
      include: { items: true },
    });

    await tx.orderLog.create({
      data: {
        orderId,
        action: OrderAction.CONFIRM,
        details: {
          activeItemCount: activeItems.length,
          subtotal: order.subtotal.toString(),
        },
      },
    });

    return updated;
  });

  return updatedOrder;
}

/**
 * Void an item (soft delete with reason)
 */
export async function voidOrderItem(
  orderId: string,
  itemId: string,
  input: VoidItemInput
): Promise<OrderWithItems> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new NotFoundError("Order");
  }

  if (!canVoidItem(order.status)) {
    throw new InvalidStateError(
      `Cannot void items in ${order.status} state. Voiding is only allowed in CONFIRMED state.`
    );
  }

  const item = order.items.find((i) => i.id === itemId);
  if (!item) {
    throw new NotFoundError("Order item");
  }

  if (item.status === "VOIDED") {
    throw new InvalidStateError("Item is already voided");
  }

  const updatedOrder = await db.$transaction(async (tx) => {
    // Update item status to VOIDED
    await tx.orderItem.update({
      where: { id: itemId },
      data: {
        status: "VOIDED",
        voidReason: input.reason,
      },
    });

    // Fetch all items
    const allItems = await tx.orderItem.findMany({
      where: { orderId: order.id },
    });

    // Recalculate totals
    const { subtotal, grandTotal } = recalculateOrderTotals(
      allItems.map((i) => ({
        pricePerUnit: i.pricePerUnit,
        quantity: i.quantity,
        status: i.status,
      })),
      order.discountType,
      order.discountValue
    );

    // Update order totals
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        subtotal: toDecimalString(subtotal),
        grandTotal: toDecimalString(grandTotal),
      },
      include: { items: true },
    });

    // Create audit log
    await tx.orderLog.create({
      data: {
        orderId: order.id,
        action: OrderAction.VOID_ITEM,
        details: {
          itemId,
          productName: item.productName,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit.toString(),
          reason: input.reason,
          newSubtotal: toDecimalString(subtotal),
        },
      },
    });

    return updated;
  });

  return updatedOrder;
}

/**
 * Checkout an order (apply discount and finalize)
 */
export async function checkoutOrder(
  orderId: string,
  input: CheckoutInput
): Promise<OrderWithItems> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new NotFoundError("Order");
  }

  if (!canCheckout(order.status)) {
    throw new InvalidStateError(
      `Cannot checkout order in ${order.status} state. Order must be CONFIRMED first.`
    );
  }

  // Check if there are any active items
  const activeItems = order.items.filter((item) => item.status === "ACTIVE");
  if (activeItems.length === 0) {
    throw new ValidationError("Cannot checkout order with no active items");
  }

  const { discountType, discountValue } = input;

  // Validate discount
  if (discountType && discountValue === undefined) {
    throw new ValidationError("Discount value is required when type is specified");
  }

  if (discountType === "PERCENT" && discountValue !== undefined) {
    if (discountValue < 0 || discountValue > 100) {
      throw new ValidationError("Percentage discount must be between 0 and 100");
    }
  }

  const updatedOrder = await db.$transaction(async (tx) => {
    // Calculate final totals
    const { subtotal, discount, grandTotal } = recalculateOrderTotals(
      order.items.map((item) => ({
        pricePerUnit: item.pricePerUnit,
        quantity: item.quantity,
        status: item.status,
      })),
      discountType ?? null,
      discountValue !== undefined ? new Decimal(discountValue) : null
    );

    // Update order with final values and mark as PAID
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: "PAID",
        subtotal: toDecimalString(subtotal),
        discountType: discountType ?? null,
        discountValue: discountValue !== undefined ? toDecimalString(new Decimal(discountValue)) : null,
        grandTotal: toDecimalString(grandTotal),
      },
      include: { items: true },
    });

    // Create audit log
    await tx.orderLog.create({
      data: {
        orderId,
        action: OrderAction.CHECKOUT,
        details: {
          subtotal: toDecimalString(subtotal),
          discountType: discountType ?? null,
          discountValue: discountValue ?? null,
          discountAmount: toDecimalString(discount),
          grandTotal: toDecimalString(grandTotal),
        },
      },
    });

    return updated;
  });

  return updatedOrder;
}

/**
 * Cancel an order
 */
export async function cancelOrder(orderId: string): Promise<OrderWithItems> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new NotFoundError("Order");
  }

  if (!canCancel(order.status)) {
    throw new InvalidStateError(
      `Cannot cancel order in ${order.status} state`
    );
  }

  const updatedOrder = await db.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
      include: { items: true },
    });

    await tx.orderLog.create({
      data: {
        orderId,
        action: OrderAction.CANCEL,
        details: {
          previousStatus: order.status,
          grandTotal: order.grandTotal.toString(),
        },
      },
    });

    return updated;
  });

  return updatedOrder;
}

/**
 * Get order by ID with items
 */
export async function getOrderById(
  orderId: string
): Promise<OrderWithItemsAndLogs | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        orderBy: [{ batchSequence: "asc" }, { createdAt: "asc" }],
      },
      logs: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return order;
}

/**
 * List orders with optional filters
 */
export async function listOrders(filters?: {
  status?: OrderStatus;
  startDate?: Date;
  endDate?: Date;
  tableNumber?: number;
}) {
  const where: Record<string, unknown> = {};

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.tableNumber) {
    where.tableNumber = filters.tableNumber;
  }

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      (where.createdAt as Record<string, Date>).gte = filters.startDate;
    }
    if (filters.endDate) {
      (where.createdAt as Record<string, Date>).lte = filters.endDate;
    }
  }

  const orders = await db.order.findMany({
    where,
    include: {
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return orders;
}
