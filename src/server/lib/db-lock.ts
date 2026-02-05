import { db } from "@/server/db";
import { Prisma } from "../../../generated/prisma";
import type { Order, OrderItem } from "@/server/types";
import { NotFoundError } from "./errors";

// ==========================================
// DATABASE LOCKING UTILITIES
// ==========================================
// Provides pessimistic locking for order operations
// to prevent race conditions during concurrent access.

/**
 * Order with items type for locked transactions
 */
export interface LockedOrderWithItems extends Order {
  items: OrderItem[];
}

/**
 * Execute a function with a locked order row.
 * Uses SELECT FOR UPDATE to acquire an exclusive lock on the order.
 *
 * This prevents:
 * - Concurrent checkouts of the same order
 * - Concurrent void operations
 * - Lost updates from concurrent modifications
 *
 * @param orderId - The order ID to lock
 * @param fn - Function to execute within the transaction
 * @returns Result of the function
 *
 * @example
 * ```ts
 * const result = await withOrderLock(orderId, async (tx, order) => {
 *   if (order.status !== "CONFIRMED") {
 *     throw new InvalidStateError("Order must be confirmed");
 *   }
 *   // Perform operations...
 *   return tx.order.update({ ... });
 * });
 * ```
 */
export async function withOrderLock<T>(
  orderId: string,
  fn: (
    tx: Prisma.TransactionClient,
    order: LockedOrderWithItems
  ) => Promise<T>
): Promise<T> {
  return db.$transaction(
    async (tx) => {
      // Acquire exclusive lock on the order row using FOR UPDATE
      // This blocks other transactions from reading or modifying this row
      const orders = await tx.$queryRaw<Order[]>`
        SELECT * FROM "Order" 
        WHERE id = ${orderId} 
        FOR UPDATE
      `;

      if (orders.length === 0) {
        throw new NotFoundError("Order", orderId);
      }

      const order = orders[0]!;

      // Fetch items (they're locked by FK cascade or we lock them explicitly)
      const items = await tx.orderItem.findMany({
        where: { orderId },
        orderBy: [{ batchSequence: "asc" }, { createdAt: "asc" }],
      });

      const lockedOrder: LockedOrderWithItems = {
        ...order,
        items,
      };

      return fn(tx, lockedOrder);
    },
    {
      // Use Serializable isolation for maximum safety
      // This ensures no phantom reads or non-repeatable reads
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      // Timeout after 10 seconds to prevent deadlocks from hanging
      timeout: 10000,
    }
  );
}

/**
 * Execute a function with locked order rows for multiple orders.
 * Useful for batch operations that need to lock multiple orders.
 *
 * @param orderIds - Array of order IDs to lock
 * @param fn - Function to execute within the transaction
 * @returns Result of the function
 */
export async function withMultipleOrderLock<T>(
  orderIds: string[],
  fn: (
    tx: Prisma.TransactionClient,
    orders: LockedOrderWithItems[]
  ) => Promise<T>
): Promise<T> {
  if (orderIds.length === 0) {
    throw new Error("At least one order ID is required");
  }

  return db.$transaction(
    async (tx) => {
      // Sort IDs to prevent deadlocks (always acquire locks in consistent order)
      const sortedIds = [...orderIds].sort();

      // Acquire locks on all orders
      const orders = await tx.$queryRaw<Order[]>`
        SELECT * FROM "Order" 
        WHERE id IN (${Prisma.join(sortedIds)})
        ORDER BY id
        FOR UPDATE
      `;

      if (orders.length !== sortedIds.length) {
        const foundIds = new Set(orders.map((o) => o.id));
        const missingId = sortedIds.find((id) => !foundIds.has(id));
        throw new NotFoundError("Order", missingId);
      }

      // Fetch all items for these orders
      const allItems = await tx.orderItem.findMany({
        where: { orderId: { in: sortedIds } },
        orderBy: [{ orderId: "asc" }, { batchSequence: "asc" }, { createdAt: "asc" }],
      });

      // Group items by order
      const itemsByOrder = new Map<string, OrderItem[]>();
      for (const item of allItems) {
        const existing = itemsByOrder.get(item.orderId) ?? [];
        existing.push(item);
        itemsByOrder.set(item.orderId, existing);
      }

      // Combine orders with their items
      const lockedOrders: LockedOrderWithItems[] = orders.map((order) => ({
        ...order,
        items: itemsByOrder.get(order.id) ?? [],
      }));

      return fn(tx, lockedOrders);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 15000, // Longer timeout for multiple orders
    }
  );
}

/**
 * Try to acquire a lock on an order without blocking.
 * Returns null if the lock cannot be acquired immediately.
 *
 * Useful for non-critical operations where you want to
 * skip if the order is currently being modified.
 *
 * @param orderId - The order ID to try to lock
 * @param fn - Function to execute if lock is acquired
 * @returns Result of the function or null if lock not acquired
 */
export async function tryOrderLock<T>(
  orderId: string,
  fn: (
    tx: Prisma.TransactionClient,
    order: LockedOrderWithItems
  ) => Promise<T>
): Promise<T | null> {
  try {
    return await db.$transaction(
      async (tx) => {
        // Use NOWAIT to fail immediately if lock cannot be acquired
        const orders = await tx.$queryRaw<Order[]>`
          SELECT * FROM "Order" 
          WHERE id = ${orderId} 
          FOR UPDATE NOWAIT
        `;

        if (orders.length === 0) {
          throw new NotFoundError("Order", orderId);
        }

        const order = orders[0]!;
        const items = await tx.orderItem.findMany({
          where: { orderId },
        });

        const lockedOrder: LockedOrderWithItems = {
          ...order,
          items,
        };

        return fn(tx, lockedOrder);
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 5000,
      }
    );
  } catch (error) {
    // Check if it's a lock not available error
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034" // Transaction failed due to lock
    ) {
      return null;
    }
    throw error;
  }
}
