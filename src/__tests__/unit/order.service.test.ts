import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database before importing the service
vi.mock("@/server/db", () => ({
  db: {
    product: { findMany: vi.fn(), findUnique: vi.fn() },
    order: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    orderItem: { findMany: vi.fn(), createMany: vi.fn(), update: vi.fn() },
    orderLog: { create: vi.fn() },
    $transaction: vi.fn((fn) => fn({
      product: { findMany: vi.fn(), findUnique: vi.fn() },
      order: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
      orderItem: { findMany: vi.fn(), createMany: vi.fn(), update: vi.fn() },
      orderLog: { create: vi.fn() },
    })),
  },
}));

import {
  validateStateTransition,
  canAddItems,
  canModifyItems,
  canVoidItem,
  canCheckout,
  canCancel,
  getNextBatchSequence,
  OrderAction,
} from "@/server/services/order.service";
import type { OrderStatus } from "@/server/types";

describe("OrderService - State Machine", () => {
  describe("validateStateTransition", () => {
    // OPEN state transitions
    it("should allow OPEN -> CONFIRMED", () => {
      expect(validateStateTransition("OPEN", "CONFIRMED")).toBe(true);
    });

    it("should allow OPEN -> CANCELLED", () => {
      expect(validateStateTransition("OPEN", "CANCELLED")).toBe(true);
    });

    it("should not allow OPEN -> PAID directly", () => {
      expect(validateStateTransition("OPEN", "PAID")).toBe(false);
    });

    // CONFIRMED state transitions
    it("should allow CONFIRMED -> PAID", () => {
      expect(validateStateTransition("CONFIRMED", "PAID")).toBe(true);
    });

    it("should allow CONFIRMED -> CANCELLED", () => {
      expect(validateStateTransition("CONFIRMED", "CANCELLED")).toBe(true);
    });

    it("should not allow CONFIRMED -> OPEN", () => {
      expect(validateStateTransition("CONFIRMED", "OPEN")).toBe(false);
    });

    // PAID state transitions (terminal state)
    it("should not allow PAID -> any state", () => {
      expect(validateStateTransition("PAID", "OPEN")).toBe(false);
      expect(validateStateTransition("PAID", "CONFIRMED")).toBe(false);
      expect(validateStateTransition("PAID", "CANCELLED")).toBe(false);
    });

    // CANCELLED state transitions (terminal state)
    it("should not allow CANCELLED -> any state", () => {
      expect(validateStateTransition("CANCELLED", "OPEN")).toBe(false);
      expect(validateStateTransition("CANCELLED", "CONFIRMED")).toBe(false);
      expect(validateStateTransition("CANCELLED", "PAID")).toBe(false);
    });
  });

  describe("canAddItems", () => {
    it("should allow adding items when OPEN", () => {
      expect(canAddItems("OPEN")).toBe(true);
    });

    it("should allow adding items when CONFIRMED (new batch)", () => {
      expect(canAddItems("CONFIRMED")).toBe(true);
    });

    it("should not allow adding items when PAID", () => {
      expect(canAddItems("PAID")).toBe(false);
    });

    it("should not allow adding items when CANCELLED", () => {
      expect(canAddItems("CANCELLED")).toBe(false);
    });
  });

  describe("canModifyItems", () => {
    it("should allow modifying items when OPEN", () => {
      expect(canModifyItems("OPEN")).toBe(true);
    });

    it("should not allow modifying items when CONFIRMED", () => {
      expect(canModifyItems("CONFIRMED")).toBe(false);
    });

    it("should not allow modifying items when PAID", () => {
      expect(canModifyItems("PAID")).toBe(false);
    });

    it("should not allow modifying items when CANCELLED", () => {
      expect(canModifyItems("CANCELLED")).toBe(false);
    });
  });

  describe("canVoidItem", () => {
    it("should not allow voiding items when OPEN (use modify instead)", () => {
      expect(canVoidItem("OPEN")).toBe(false);
    });

    it("should allow voiding items when CONFIRMED", () => {
      expect(canVoidItem("CONFIRMED")).toBe(true);
    });

    it("should not allow voiding items when PAID", () => {
      expect(canVoidItem("PAID")).toBe(false);
    });

    it("should not allow voiding items when CANCELLED", () => {
      expect(canVoidItem("CANCELLED")).toBe(false);
    });
  });

  describe("canCheckout", () => {
    it("should not allow checkout when OPEN", () => {
      expect(canCheckout("OPEN")).toBe(false);
    });

    it("should allow checkout when CONFIRMED", () => {
      expect(canCheckout("CONFIRMED")).toBe(true);
    });

    it("should not allow checkout when PAID", () => {
      expect(canCheckout("PAID")).toBe(false);
    });

    it("should not allow checkout when CANCELLED", () => {
      expect(canCheckout("CANCELLED")).toBe(false);
    });
  });

  describe("canCancel", () => {
    it("should allow cancellation when OPEN", () => {
      expect(canCancel("OPEN")).toBe(true);
    });

    it("should allow cancellation when CONFIRMED", () => {
      expect(canCancel("CONFIRMED")).toBe(true);
    });

    it("should not allow cancellation when PAID", () => {
      expect(canCancel("PAID")).toBe(false);
    });

    it("should not allow cancellation when already CANCELLED", () => {
      expect(canCancel("CANCELLED")).toBe(false);
    });
  });

  describe("getNextBatchSequence", () => {
    it("should return 1 for empty items array", () => {
      expect(getNextBatchSequence([])).toBe(1);
    });

    it("should return max batch + 1", () => {
      const items = [
        { batchSequence: 1 },
        { batchSequence: 2 },
        { batchSequence: 1 },
      ];
      expect(getNextBatchSequence(items as any)).toBe(3);
    });

    it("should handle single item", () => {
      const items = [{ batchSequence: 5 }];
      expect(getNextBatchSequence(items as any)).toBe(6);
    });
  });
});

describe("OrderService - OrderAction Enum", () => {
  it("should have correct action values", () => {
    expect(OrderAction.CREATE).toBe("CREATE");
    expect(OrderAction.ADD_ITEMS).toBe("ADD_ITEMS");
    expect(OrderAction.CONFIRM).toBe("CONFIRM");
    expect(OrderAction.VOID_ITEM).toBe("VOID_ITEM");
    expect(OrderAction.CHECKOUT).toBe("CHECKOUT");
    expect(OrderAction.CANCEL).toBe("CANCEL");
  });
});
