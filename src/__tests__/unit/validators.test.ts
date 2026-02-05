import { describe, it, expect } from "vitest";
import {
  createOrderSchema,
  addItemsSchema,
  voidItemSchema,
  checkoutSchema,
  orderListFilterSchema,
} from "@/server/validators/order.validator";
import {
  createProductSchema,
  updateProductSchema,
} from "@/server/validators/product.validator";

describe("Order Validators", () => {
  describe("createOrderSchema", () => {
    it("should validate valid order creation input", () => {
      const input = {
        tableNumber: 5,
        items: [
          { productId: "prod_123", quantity: 2 },
          { productId: "prod_456", quantity: 1 },
        ],
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject negative table number", () => {
      const input = {
        tableNumber: -1,
        items: [{ productId: "prod_123", quantity: 2 }],
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject empty items array", () => {
      const input = {
        tableNumber: 1,
        items: [],
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject non-positive quantity", () => {
      const input = {
        tableNumber: 1,
        items: [{ productId: "prod_123", quantity: 0 }],
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject missing productId", () => {
      const input = {
        tableNumber: 1,
        items: [{ quantity: 2 }],
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("addItemsSchema", () => {
    it("should validate valid add items input", () => {
      const input = {
        items: [
          { productId: "prod_123", quantity: 3 },
        ],
      };

      const result = addItemsSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject empty items", () => {
      const input = { items: [] };
      const result = addItemsSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("voidItemSchema", () => {
    it("should validate valid void reason", () => {
      const input = { reason: "Customer changed their mind" };
      const result = voidItemSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject empty reason", () => {
      const input = { reason: "" };
      const result = voidItemSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject missing reason", () => {
      const input = {};
      const result = voidItemSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("checkoutSchema", () => {
    it("should validate checkout without discount", () => {
      const input = {};
      const result = checkoutSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should validate checkout with percentage discount", () => {
      const input = {
        discountType: "PERCENT",
        discountValue: 10,
      };
      const result = checkoutSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should validate checkout with fixed discount", () => {
      const input = {
        discountType: "FIXED",
        discountValue: 50,
      };
      const result = checkoutSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject percentage over 100", () => {
      const input = {
        discountType: "PERCENT",
        discountValue: 150,
      };
      const result = checkoutSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject discount type without value", () => {
      const input = {
        discountType: "PERCENT",
      };
      const result = checkoutSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject negative discount value", () => {
      const input = {
        discountType: "FIXED",
        discountValue: -10,
      };
      const result = checkoutSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("orderListFilterSchema", () => {
    it("should validate empty filters", () => {
      const input = {};
      const result = orderListFilterSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should validate status filter", () => {
      const input = { status: "OPEN" };
      const result = orderListFilterSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should validate table number filter", () => {
      const input = { tableNumber: "5" };
      const result = orderListFilterSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tableNumber).toBe(5);
      }
    });

    it("should reject invalid status", () => {
      const input = { status: "INVALID" };
      const result = orderListFilterSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe("Product Validators", () => {
  describe("createProductSchema", () => {
    it("should validate valid product input", () => {
      const input = {
        name: "Burger",
        price: 9.99,
        category: "Food",
      };

      const result = createProductSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should default isActive to true", () => {
      const input = {
        name: "Burger",
        price: 9.99,
        category: "Food",
      };

      const result = createProductSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isActive).toBe(true);
      }
    });

    it("should reject empty name", () => {
      const input = {
        name: "",
        price: 9.99,
        category: "Food",
      };

      const result = createProductSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject negative price", () => {
      const input = {
        name: "Burger",
        price: -5,
        category: "Food",
      };

      const result = createProductSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should reject price with more than 2 decimal places", () => {
      const input = {
        name: "Burger",
        price: 9.999,
        category: "Food",
      };

      const result = createProductSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("updateProductSchema", () => {
    it("should validate partial update", () => {
      const input = { name: "New Burger" };
      const result = updateProductSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should validate full update", () => {
      const input = {
        name: "New Burger",
        price: 12.99,
        category: "Premium Food",
        isActive: false,
      };

      const result = updateProductSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should validate empty update", () => {
      const input = {};
      const result = updateProductSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});
