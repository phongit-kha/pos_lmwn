import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  calculateItemTotal,
  calculateSubtotal,
  calculateDiscount,
  calculateGrandTotal,
  recalculateOrderTotals,
} from "@/server/services/calculation.service";
import type { CalculationItem } from "@/server/types";

describe("CalculationService", () => {
  describe("calculateItemTotal", () => {
    it("should calculate item total correctly", () => {
      const result = calculateItemTotal(new Decimal("10.50"), 3);
      expect(result.toFixed(2)).toBe("31.50");
    });

    it("should handle decimal prices correctly", () => {
      const result = calculateItemTotal(new Decimal("19.99"), 2);
      expect(result.toFixed(2)).toBe("39.98");
    });

    it("should handle quantity of 1", () => {
      const result = calculateItemTotal(new Decimal("100.00"), 1);
      expect(result.toFixed(2)).toBe("100.00");
    });

    it("should handle very small prices", () => {
      const result = calculateItemTotal(new Decimal("0.01"), 100);
      expect(result.toFixed(2)).toBe("1.00");
    });

    it("should handle large quantities", () => {
      const result = calculateItemTotal(new Decimal("9.99"), 1000);
      expect(result.toFixed(2)).toBe("9990.00");
    });

    it("should not have floating point errors", () => {
      // Classic floating point issue: 0.1 + 0.2 !== 0.3 in JS
      const result = calculateItemTotal(new Decimal("0.1"), 3);
      expect(result.toFixed(2)).toBe("0.30");
    });
  });

  describe("calculateSubtotal", () => {
    it("should sum all ACTIVE items correctly", () => {
      const items: CalculationItem[] = [
        { pricePerUnit: "10.00", quantity: 2, status: "ACTIVE" },
        { pricePerUnit: "15.50", quantity: 1, status: "ACTIVE" },
      ];
      const result = calculateSubtotal(items);
      expect(result.toFixed(2)).toBe("35.50");
    });

    it("should exclude VOIDED items from subtotal", () => {
      const items: CalculationItem[] = [
        { pricePerUnit: "10.00", quantity: 2, status: "ACTIVE" },
        { pricePerUnit: "100.00", quantity: 1, status: "VOIDED" },
        { pricePerUnit: "5.00", quantity: 3, status: "ACTIVE" },
      ];
      const result = calculateSubtotal(items);
      expect(result.toFixed(2)).toBe("35.00"); // 20 + 15, excluding 100
    });

    it("should return 0 for empty items array", () => {
      const result = calculateSubtotal([]);
      expect(result.toFixed(2)).toBe("0.00");
    });

    it("should return 0 when all items are VOIDED", () => {
      const items: CalculationItem[] = [
        { pricePerUnit: "10.00", quantity: 2, status: "VOIDED" },
        { pricePerUnit: "15.50", quantity: 1, status: "VOIDED" },
      ];
      const result = calculateSubtotal(items);
      expect(result.toFixed(2)).toBe("0.00");
    });

    it("should handle mixed decimal types (string, number, Decimal)", () => {
      const items: CalculationItem[] = [
        { pricePerUnit: "10.00", quantity: 1, status: "ACTIVE" },
        { pricePerUnit: new Decimal("20.00"), quantity: 1, status: "ACTIVE" },
        { pricePerUnit: 30, quantity: 1, status: "ACTIVE" },
      ];
      const result = calculateSubtotal(items);
      expect(result.toFixed(2)).toBe("60.00");
    });
  });

  describe("calculateDiscount", () => {
    it("should calculate percentage discount correctly", () => {
      const subtotal = new Decimal("100.00");
      const result = calculateDiscount(subtotal, "PERCENT", new Decimal("10"));
      expect(result.toFixed(2)).toBe("10.00");
    });

    it("should return fixed discount value directly", () => {
      const subtotal = new Decimal("100.00");
      const result = calculateDiscount(subtotal, "FIXED", new Decimal("25.00"));
      expect(result.toFixed(2)).toBe("25.00");
    });

    it("should return 0 when discount type is null", () => {
      const subtotal = new Decimal("100.00");
      const result = calculateDiscount(subtotal, null, new Decimal("10"));
      expect(result.toFixed(2)).toBe("0.00");
    });

    it("should return 0 when discount value is null", () => {
      const subtotal = new Decimal("100.00");
      const result = calculateDiscount(subtotal, "PERCENT", null);
      expect(result.toFixed(2)).toBe("0.00");
    });

    it("should handle 0% discount", () => {
      const subtotal = new Decimal("100.00");
      const result = calculateDiscount(subtotal, "PERCENT", new Decimal("0"));
      expect(result.toFixed(2)).toBe("0.00");
    });

    it("should handle 100% discount", () => {
      const subtotal = new Decimal("100.00");
      const result = calculateDiscount(subtotal, "PERCENT", new Decimal("100"));
      expect(result.toFixed(2)).toBe("100.00");
    });

    it("should calculate percentage with decimal precision", () => {
      const subtotal = new Decimal("99.99");
      const result = calculateDiscount(subtotal, "PERCENT", new Decimal("15"));
      expect(result.toFixed(2)).toBe("15.00"); // 99.99 * 0.15 = 14.9985
    });
  });

  describe("calculateGrandTotal", () => {
    it("should subtract discount from subtotal", () => {
      const subtotal = new Decimal("100.00");
      const discount = new Decimal("20.00");
      const result = calculateGrandTotal(subtotal, discount);
      expect(result.toFixed(2)).toBe("80.00");
    });

    it("should floor at 0.00 when discount exceeds subtotal", () => {
      const subtotal = new Decimal("50.00");
      const discount = new Decimal("100.00");
      const result = calculateGrandTotal(subtotal, discount);
      expect(result.toFixed(2)).toBe("0.00");
    });

    it("should handle zero discount", () => {
      const subtotal = new Decimal("100.00");
      const discount = new Decimal("0");
      const result = calculateGrandTotal(subtotal, discount);
      expect(result.toFixed(2)).toBe("100.00");
    });

    it("should handle zero subtotal", () => {
      const subtotal = new Decimal("0");
      const discount = new Decimal("10.00");
      const result = calculateGrandTotal(subtotal, discount);
      expect(result.toFixed(2)).toBe("0.00");
    });

    it("should handle equal subtotal and discount", () => {
      const subtotal = new Decimal("50.00");
      const discount = new Decimal("50.00");
      const result = calculateGrandTotal(subtotal, discount);
      expect(result.toFixed(2)).toBe("0.00");
    });
  });

  describe("recalculateOrderTotals", () => {
    it("should calculate all totals correctly", () => {
      const items: CalculationItem[] = [
        { pricePerUnit: "25.00", quantity: 4, status: "ACTIVE" }, // 100
        { pricePerUnit: "50.00", quantity: 1, status: "ACTIVE" }, // 50
      ];
      const result = recalculateOrderTotals(items, "PERCENT", new Decimal("10"));
      
      expect(result.subtotal.toFixed(2)).toBe("150.00");
      expect(result.discount.toFixed(2)).toBe("15.00");
      expect(result.grandTotal.toFixed(2)).toBe("135.00");
    });

    it("should handle no discount", () => {
      const items: CalculationItem[] = [
        { pricePerUnit: "30.00", quantity: 2, status: "ACTIVE" },
      ];
      const result = recalculateOrderTotals(items, null, null);
      
      expect(result.subtotal.toFixed(2)).toBe("60.00");
      expect(result.discount.toFixed(2)).toBe("0.00");
      expect(result.grandTotal.toFixed(2)).toBe("60.00");
    });

    it("should exclude voided items from calculation", () => {
      const items: CalculationItem[] = [
        { pricePerUnit: "50.00", quantity: 2, status: "ACTIVE" },  // 100
        { pricePerUnit: "200.00", quantity: 1, status: "VOIDED" }, // excluded
      ];
      const result = recalculateOrderTotals(items, "FIXED", new Decimal("20"));
      
      expect(result.subtotal.toFixed(2)).toBe("100.00");
      expect(result.discount.toFixed(2)).toBe("20.00");
      expect(result.grandTotal.toFixed(2)).toBe("80.00");
    });

    it("should handle complex scenario with multiple items and percentage discount", () => {
      const items: CalculationItem[] = [
        { pricePerUnit: "12.99", quantity: 3, status: "ACTIVE" },  // 38.97
        { pricePerUnit: "8.50", quantity: 2, status: "ACTIVE" },   // 17.00
        { pricePerUnit: "25.00", quantity: 1, status: "VOIDED" },  // excluded
        { pricePerUnit: "15.75", quantity: 4, status: "ACTIVE" },  // 63.00
      ];
      const result = recalculateOrderTotals(items, "PERCENT", new Decimal("15"));
      
      // Subtotal: 38.97 + 17.00 + 63.00 = 118.97
      expect(result.subtotal.toFixed(2)).toBe("118.97");
      // Discount: 118.97 * 0.15 = 17.8455
      expect(result.discount.toFixed(2)).toBe("17.85");
      // Grand total: 118.97 - 17.8455 = 101.1245
      expect(result.grandTotal.toFixed(2)).toBe("101.12");
    });
  });
});
