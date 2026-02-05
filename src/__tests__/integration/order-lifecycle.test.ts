import { describe, it, expect, vi, beforeEach } from "vitest";
import Decimal from "decimal.js";

// Mock the database module
// Prices are in satang (1 baht = 100 satang)
vi.mock("@/server/db", () => {
  const mockProducts = [
    {
      id: "prod_1",
      name: "Burger",
      price: new Decimal("10990"), // 109.90 baht in satang
      category: "Food",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "prod_2",
      name: "Fries",
      price: new Decimal("4990"), // 49.90 baht in satang
      category: "Sides",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  let orderIdCounter = 0;
  let itemIdCounter = 0;
  const orders: Map<string, any> = new Map();
  const orderItems: Map<string, any[]> = new Map();
  const orderLogs: Map<string, any[]> = new Map();

  return {
    db: {
      product: {
        findMany: vi.fn(({ where }) => {
          if (where?.id?.in) {
            return Promise.resolve(
              mockProducts.filter((p) => where.id.in.includes(p.id) && p.isActive)
            );
          }
          return Promise.resolve(mockProducts.filter((p) => p.isActive));
        }),
        findUnique: vi.fn(({ where }) => {
          return Promise.resolve(mockProducts.find((p) => p.id === where.id));
        }),
        create: vi.fn((data) => {
          const newProduct = {
            id: `prod_${Date.now()}`,
            ...data.data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockProducts.push(newProduct);
          return Promise.resolve(newProduct);
        }),
      },
      order: {
        findUnique: vi.fn(({ where, include }) => {
          const order = orders.get(where.id);
          if (!order) return Promise.resolve(null);
          if (include?.items) {
            order.items = orderItems.get(where.id) || [];
          }
          if (include?.logs) {
            order.logs = orderLogs.get(where.id) || [];
          }
          return Promise.resolve(order);
        }),
        findMany: vi.fn(({ where, include }) => {
          let result = Array.from(orders.values());
          if (where?.status) {
            result = result.filter((o) => o.status === where.status);
          }
          if (include?.items) {
            result = result.map((o) => ({
              ...o,
              items: orderItems.get(o.id) || [],
            }));
          }
          return Promise.resolve(result);
        }),
        create: vi.fn(({ data }) => {
          const id = `order_${++orderIdCounter}`;
          const order = {
            id,
            ...data,
            subtotal: new Decimal(data.subtotal || 0),
            grandTotal: new Decimal(data.grandTotal || 0),
            discountValue: data.discountValue ? new Decimal(data.discountValue) : null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          orders.set(id, order);
          orderItems.set(id, []);
          orderLogs.set(id, []);
          return Promise.resolve(order);
        }),
        update: vi.fn(({ where, data, include }) => {
          const order = orders.get(where.id);
          if (!order) return Promise.resolve(null);
          Object.assign(order, data, { updatedAt: new Date() });
          if (data.subtotal) order.subtotal = new Decimal(data.subtotal);
          if (data.grandTotal) order.grandTotal = new Decimal(data.grandTotal);
          if (data.discountValue) order.discountValue = new Decimal(data.discountValue);
          if (include?.items) {
            order.items = orderItems.get(where.id) || [];
          }
          return Promise.resolve(order);
        }),
      },
      orderItem: {
        findMany: vi.fn(({ where }) => {
          return Promise.resolve(orderItems.get(where.orderId) || []);
        }),
        createMany: vi.fn(({ data }) => {
          for (const item of data) {
            const id = `item_${++itemIdCounter}`;
            const items = orderItems.get(item.orderId) || [];
            items.push({
              id,
              ...item,
              pricePerUnit: new Decimal(item.pricePerUnit.toString()),
              createdAt: new Date(),
            });
            orderItems.set(item.orderId, items);
          }
          return Promise.resolve({ count: data.length });
        }),
        update: vi.fn(({ where, data }) => {
          for (const [orderId, items] of orderItems.entries()) {
            const item = items.find((i) => i.id === where.id);
            if (item) {
              Object.assign(item, data);
              return Promise.resolve(item);
            }
          }
          return Promise.resolve(null);
        }),
      },
      orderLog: {
        create: vi.fn(({ data }) => {
          const logs = orderLogs.get(data.orderId) || [];
          logs.push({
            id: `log_${Date.now()}`,
            ...data,
            createdAt: new Date(),
          });
          orderLogs.set(data.orderId, logs);
          return Promise.resolve(logs[logs.length - 1]);
        }),
        findMany: vi.fn(({ where }) => {
          return Promise.resolve(orderLogs.get(where.orderId) || []);
        }),
      },
      // Raw query support for pessimistic locking
      $queryRaw: vi.fn((strings, ...values) => {
        // Parse the template literal to extract order ID
        const query = typeof strings === 'string' 
          ? strings 
          : strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '');
        
        // Check if it's a SELECT ... FOR UPDATE query for orders
        if (query.includes('SELECT') && query.includes('"Order"')) {
          // Extract the order ID from values
          const orderId = values[0];
          const order = orders.get(orderId);
          if (order) {
            return Promise.resolve([order]);
          }
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      }),
      $transaction: vi.fn(async (callbackOrPromises, options) => {
        // Check if it's a callback style (used by withOrderLock)
        if (typeof callbackOrPromises === 'function') {
          // Create a transaction client that mirrors the db object
          const { db } = await import("@/server/db");
          const txClient = {
            ...db,
            // $queryRaw for transaction client (used by withOrderLock)
            $queryRaw: vi.fn((strings, ...values) => {
              const orderId = values[0];
              const order = orders.get(orderId);
              if (order) {
                return Promise.resolve([order]);
              }
              return Promise.resolve([]);
            }),
          };
          return callbackOrPromises(txClient);
        }
        // Array of promises style
        return Promise.all(callbackOrPromises);
      }),
    },
  };
});

// Import after mocking
import {
  createOrder,
  confirmOrder,
  addItemsToOrder,
  voidOrderItem,
  checkoutOrder,
  cancelOrder,
} from "@/server/services/order.service";
import { InvalidStateError, NotFoundError, ValidationError } from "@/server/types";

describe("Order Lifecycle Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Create Order", () => {
    it("should create a new order with items", async () => {
      const order = await createOrder({
        tableNumber: 1,
        items: [
          { productId: "prod_1", quantity: 2 },
          { productId: "prod_2", quantity: 1 },
        ],
      });

      expect(order).toBeDefined();
      expect(order.tableNumber).toBe(1);
      expect(order.status).toBe("OPEN");
      expect(order.items).toHaveLength(2);
    });

    it("should freeze product prices at order time", async () => {
      const order = await createOrder({
        tableNumber: 2,
        items: [{ productId: "prod_1", quantity: 1 }],
      });

      const item = order.items[0];
      expect(item).toBeDefined();
      expect(item?.productName).toBe("Burger");
      // Price is in satang (10990 satang = 109.90 baht)
      expect(new Decimal(item?.pricePerUnit.toString() || 0).toFixed(0)).toBe("10990");
    });

    it("should throw NotFoundError for invalid product", async () => {
      await expect(
        createOrder({
          tableNumber: 1,
          items: [{ productId: "invalid_prod", quantity: 1 }],
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("Confirm Order", () => {
    it("should transition order from OPEN to CONFIRMED", async () => {
      const order = await createOrder({
        tableNumber: 3,
        items: [{ productId: "prod_1", quantity: 1 }],
      });

      const confirmed = await confirmOrder(order.id);
      expect(confirmed.status).toBe("CONFIRMED");
    });

    it("should not allow confirming already confirmed order", async () => {
      const order = await createOrder({
        tableNumber: 4,
        items: [{ productId: "prod_1", quantity: 1 }],
      });

      await confirmOrder(order.id);

      await expect(confirmOrder(order.id)).rejects.toThrow(InvalidStateError);
    });
  });

  describe("Add Items (Batch Ordering)", () => {
    it("should add items to OPEN order", async () => {
      const order = await createOrder({
        tableNumber: 5,
        items: [{ productId: "prod_1", quantity: 1 }],
      });

      const updated = await addItemsToOrder(order.id, {
        items: [{ productId: "prod_2", quantity: 2 }],
      });

      expect(updated.items).toHaveLength(2);
    });

    it("should add items to CONFIRMED order with new batch sequence", async () => {
      const order = await createOrder({
        tableNumber: 6,
        items: [{ productId: "prod_1", quantity: 1 }],
      });

      await confirmOrder(order.id);

      const updated = await addItemsToOrder(order.id, {
        items: [{ productId: "prod_2", quantity: 1 }],
      });

      expect(updated.items).toHaveLength(2);
      // New items should have batch sequence 2
      const newItem = updated.items.find((i) => i.productId === "prod_2");
      expect(newItem?.batchSequence).toBe(2);
    });
  });

  describe("Void Item", () => {
    it("should void item in CONFIRMED order", async () => {
      const order = await createOrder({
        tableNumber: 7,
        items: [{ productId: "prod_1", quantity: 1 }],
      });

      await confirmOrder(order.id);

      const itemId = order.items[0]?.id;
      expect(itemId).toBeDefined();

      const updated = await voidOrderItem(order.id, itemId!, {
        reason: "Customer changed mind",
      });

      const voidedItem = updated.items.find((i) => i.id === itemId);
      expect(voidedItem?.status).toBe("VOIDED");
      expect(voidedItem?.voidReason).toBe("Customer changed mind");
    });

    it("should not allow voiding in OPEN order", async () => {
      const order = await createOrder({
        tableNumber: 8,
        items: [{ productId: "prod_1", quantity: 1 }],
      });

      const itemId = order.items[0]?.id;

      await expect(
        voidOrderItem(order.id, itemId!, { reason: "Test" })
      ).rejects.toThrow(InvalidStateError);
    });
  });

  describe("Checkout", () => {
    it("should checkout CONFIRMED order without discount", async () => {
      const order = await createOrder({
        tableNumber: 9,
        items: [{ productId: "prod_1", quantity: 2 }],
      });

      await confirmOrder(order.id);

      const paid = await checkoutOrder(order.id, {});
      expect(paid.status).toBe("PAID");
    });

    it("should apply percentage discount", async () => {
      const order = await createOrder({
        tableNumber: 10,
        items: [{ productId: "prod_1", quantity: 1 }], // 10.99
      });

      await confirmOrder(order.id);

      const paid = await checkoutOrder(order.id, {
        discountType: "PERCENT",
        discountValue: 10,
      });

      expect(paid.status).toBe("PAID");
      expect(paid.discountType).toBe("PERCENT");
    });

    it("should apply fixed discount", async () => {
      const order = await createOrder({
        tableNumber: 11,
        items: [{ productId: "prod_1", quantity: 1 }],
      });

      await confirmOrder(order.id);

      const paid = await checkoutOrder(order.id, {
        discountType: "FIXED",
        discountValue: 5,
      });

      expect(paid.status).toBe("PAID");
      expect(paid.discountType).toBe("FIXED");
    });

    it("should not allow checkout of OPEN order", async () => {
      const order = await createOrder({
        tableNumber: 12,
        items: [{ productId: "prod_1", quantity: 1 }],
      });

      await expect(checkoutOrder(order.id, {})).rejects.toThrow(InvalidStateError);
    });
  });

  describe("Cancel Order", () => {
    it("should cancel OPEN order", async () => {
      const order = await createOrder({
        tableNumber: 13,
        items: [{ productId: "prod_1", quantity: 1 }],
      });

      const cancelled = await cancelOrder(order.id);
      expect(cancelled.status).toBe("CANCELLED");
    });

    it("should cancel CONFIRMED order", async () => {
      const order = await createOrder({
        tableNumber: 14,
        items: [{ productId: "prod_1", quantity: 1 }],
      });

      await confirmOrder(order.id);

      const cancelled = await cancelOrder(order.id);
      expect(cancelled.status).toBe("CANCELLED");
    });

    it("should not allow cancelling PAID order", async () => {
      const order = await createOrder({
        tableNumber: 15,
        items: [{ productId: "prod_1", quantity: 1 }],
      });

      await confirmOrder(order.id);
      await checkoutOrder(order.id, {});

      await expect(cancelOrder(order.id)).rejects.toThrow(InvalidStateError);
    });
  });
});
