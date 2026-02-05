import { db } from "@/server/db";
import {
  recalculateOrderTotals,
  toBigInt,
} from "@/server/services/calculation.service";
import { withOrderLock } from "@/server/lib/db-lock";
import { logger } from "@/server/lib/logger";
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
  OrderFilters,
  PaginatedResponse,
  OrderListItem,
} from "@/server/types";
import {
  NotFoundError,
  InvalidStateError,
  ValidationError,
  ErrorMessage,
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
      throw new NotFoundError("Product", item.productId);
    }
  }

  // Create order with items in a transaction
  const order = await db.$transaction(async (tx) => {
    // Create the order
    const newOrder = await tx.order.create({
      data: {
        tableNumber,
        status: "OPEN",
        subtotal: 0n,
        grandTotal: 0n,
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

    // Calculate totals using BigInt
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
        subtotal,
        grandTotal,
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
          subtotal: subtotal.toString(),
        },
      },
    });

    return updatedOrder;
  });

  return order;
}

/**
 * Add items to an existing order (batch ordering)
 * Uses pessimistic locking to prevent race conditions
 */
export async function addItemsToOrder(
  orderId: string,
  input: AddItemsInput
): Promise<OrderWithItems> {
  const { items: itemsInput } = input;

  // Fetch all products before locking to minimize lock duration
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
      throw new NotFoundError("Product", item.productId);
    }
  }

  logger.info("Adding items to order", { orderId, itemCount: itemsInput.length });

  return withOrderLock(orderId, async (tx, order) => {
    // Validate state inside the lock
    if (!canAddItems(order.status)) {
      throw new InvalidStateError(
        ErrorMessage.ORDER.MUST_BE_IN_STATE("OPEN or CONFIRMED", order.status)
      );
    }

    // Get next batch sequence
    const nextBatch = getNextBatchSequence(order.items);

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

    // Recalculate totals using BigInt
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
        subtotal,
        grandTotal,
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
          newSubtotal: subtotal.toString(),
        },
      },
    });

    logger.info("Items added to order", { 
      orderId, 
      batchSequence: nextBatch, 
      newSubtotal: subtotal.toString() 
    });

    return updated;
  });
}

/**
 * Confirm an order (send to kitchen)
 * Uses pessimistic locking to prevent race conditions
 */
export async function confirmOrder(orderId: string): Promise<OrderWithItems> {
  logger.info("Confirming order", { orderId });

  return withOrderLock(orderId, async (tx, order) => {
    // Validate state inside the lock
    if (!validateStateTransition(order.status, "CONFIRMED")) {
      throw new InvalidStateError(
        ErrorMessage.ORDER.INVALID_STATE_TRANSITION(order.status, "CONFIRMED")
      );
    }

    // Check if there are any active items
    const activeItems = order.items.filter((item) => item.status === "ACTIVE");
    if (activeItems.length === 0) {
      throw new ValidationError(ErrorMessage.ORDER.CANNOT_CHECKOUT_EMPTY);
    }

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

    logger.info("Order confirmed", { orderId, activeItemCount: activeItems.length });

    return updated;
  });
}

/**
 * Void an item (soft delete with reason)
 * Uses pessimistic locking to prevent race conditions
 */
export async function voidOrderItem(
  orderId: string,
  itemId: string,
  input: VoidItemInput
): Promise<OrderWithItems> {
  logger.info("Voiding order item", { orderId, itemId, reason: input.reason });

  return withOrderLock(orderId, async (tx, order) => {
    // Validate state inside the lock
    if (!canVoidItem(order.status)) {
      throw new InvalidStateError(
        ErrorMessage.ORDER_ITEM.CANNOT_VOID_IN_STATE(order.status)
      );
    }

    const item = order.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundError("Order item", itemId);
    }

    if (item.status === "VOIDED") {
      throw new InvalidStateError(ErrorMessage.ORDER_ITEM.ALREADY_VOIDED);
    }

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

    // Recalculate totals using BigInt
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
        subtotal,
        grandTotal,
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
          newSubtotal: subtotal.toString(),
        },
      },
    });

    logger.info("Order item voided", { 
      orderId, 
      itemId, 
      productName: item.productName,
      newSubtotal: subtotal.toString() 
    });

    return updated;
  });
}

/**
 * Update item quantity (only allowed in OPEN state)
 * Uses pessimistic locking to prevent race conditions
 */
export async function updateItemQuantity(
  orderId: string,
  itemId: string,
  quantity: number
): Promise<OrderWithItems> {
  // Validate before acquiring lock
  if (quantity < 1) {
    throw new ValidationError(ErrorMessage.ORDER_ITEM.QUANTITY_MIN);
  }

  logger.info("Updating item quantity", { orderId, itemId, quantity });

  return withOrderLock(orderId, async (tx, order) => {
    // Validate state inside the lock
    if (!canModifyItems(order.status)) {
      throw new InvalidStateError(
        ErrorMessage.ORDER.MUST_BE_IN_STATE("OPEN", order.status)
      );
    }

    const item = order.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundError("Order item", itemId);
    }

    if (item.status === "VOIDED") {
      throw new InvalidStateError(ErrorMessage.ORDER_ITEM.ALREADY_VOIDED);
    }

    // Update item quantity
    await tx.orderItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    // Fetch all items
    const allItems = await tx.orderItem.findMany({
      where: { orderId: order.id },
    });

    // Recalculate totals using BigInt
    const { subtotal, grandTotal } = recalculateOrderTotals(
      allItems.map((i) => ({
        pricePerUnit: i.pricePerUnit,
        quantity: i.id === itemId ? quantity : i.quantity,
        status: i.status,
      })),
      order.discountType,
      order.discountValue
    );

    // Update order totals
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        subtotal,
        grandTotal,
      },
      include: { items: true },
    });

    logger.info("Item quantity updated", { 
      orderId, 
      itemId, 
      newQuantity: quantity,
      newSubtotal: subtotal.toString() 
    });

    return updated;
  });
}

/**
 * Checkout an order (apply discount and finalize)
 * Uses pessimistic locking to prevent double-checkout race conditions
 */
export async function checkoutOrder(
  orderId: string,
  input: CheckoutInput
): Promise<OrderWithItems> {
  const { discountType, discountValue } = input;

  // Validate discount input before acquiring lock
  if (discountType && discountValue === undefined) {
    throw new ValidationError("Discount value is required when type is specified");
  }

  if (discountType === "PERCENT" && discountValue !== undefined) {
    if (discountValue < 0 || discountValue > 50) {
      throw new ValidationError(ErrorMessage.DISCOUNT.PERCENT_RANGE);
    }
  }

  // Convert discount value to BigInt
  const discountValueBigInt = discountValue !== undefined 
    ? toBigInt(discountValue) 
    : null;

  logger.info("Processing checkout", { orderId, discountType, discountValue });

  return withOrderLock(orderId, async (tx, order) => {
    // Validate state inside the lock - critical for preventing double-checkout
    if (!canCheckout(order.status)) {
      throw new InvalidStateError(ErrorMessage.ORDER.CANNOT_CHECKOUT_UNCONFIRMED);
    }

    // Check if there are any active items
    const activeItems = order.items.filter((item) => item.status === "ACTIVE");
    if (activeItems.length === 0) {
      throw new ValidationError(ErrorMessage.ORDER.CANNOT_CHECKOUT_EMPTY);
    }

    // Calculate final totals using BigInt
    const { subtotal, discount, grandTotal } = recalculateOrderTotals(
      order.items.map((item) => ({
        pricePerUnit: item.pricePerUnit,
        quantity: item.quantity,
        status: item.status,
      })),
      discountType ?? null,
      discountValueBigInt
    );

    // Validate fixed discount doesn't exceed subtotal
    if (discountType === "FIXED" && discountValueBigInt !== null && discountValueBigInt > subtotal) {
      throw new ValidationError(ErrorMessage.DISCOUNT.EXCEEDS_SUBTOTAL);
    }

    // Update order with final values and mark as PAID
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: "PAID",
        subtotal,
        discountType: discountType ?? null,
        discountValue: discountValueBigInt,
        grandTotal,
      },
      include: { items: true },
    });

    // Create audit log
    await tx.orderLog.create({
      data: {
        orderId,
        action: OrderAction.CHECKOUT,
        details: {
          subtotal: subtotal.toString(),
          discountType: discountType ?? null,
          discountValue: discountValue ?? null,
          discountAmount: discount.toString(),
          grandTotal: grandTotal.toString(),
        },
      },
    });

    logger.info("Order checkout completed", { 
      orderId, 
      grandTotal: grandTotal.toString(),
      discountApplied: discount.toString()
    });

    return updated;
  });
}

/**
 * Cancel an order
 * Uses pessimistic locking to prevent race conditions
 */
export async function cancelOrder(orderId: string): Promise<OrderWithItems> {
  logger.info("Cancelling order", { orderId });

  return withOrderLock(orderId, async (tx, order) => {
    // Validate state inside the lock
    if (!canCancel(order.status)) {
      if (order.status === "PAID") {
        throw new InvalidStateError(ErrorMessage.ORDER.CANNOT_CANCEL_PAID);
      }
      throw new InvalidStateError(
        ErrorMessage.ORDER.INVALID_STATE_TRANSITION(order.status, "CANCELLED")
      );
    }

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

    logger.info("Order cancelled", { orderId, previousStatus: order.status });

    return updated;
  });
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
 * List orders with optional filters and pagination
 * Returns lean list items for efficiency
 */
export async function listOrders(
  filters?: OrderFilters
): Promise<PaginatedResponse<OrderListItem>> {
  const page = filters?.page ?? 1;
  const limit = Math.min(filters?.limit ?? 20, 100); // Max 100 per page
  const skip = (page - 1) * limit;

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

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      include: {
        items: {
          where: { status: "ACTIVE" },
          select: { id: true }, // Only need for count
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.order.count({ where }),
  ]);

  // Transform to lean list items
  const data = orders.map((order) => ({
    id: order.id,
    tableNumber: order.tableNumber,
    status: order.status,
    grandTotal: order.grandTotal.toString(),
    itemCount: order.items.length,
    createdAt: order.createdAt.toISOString(),
  }));

  return {
    data,
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
 * Get orders with full items (for internal use or detailed view)
 */
export async function listOrdersWithItems(filters?: {
  status?: OrderStatus;
  startDate?: Date;
  endDate?: Date;
  tableNumber?: number;
}): Promise<OrderWithItems[]> {
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
