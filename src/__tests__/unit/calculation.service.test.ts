import { describe, it, expect } from "vitest";
import {
  calculateItemTotal,
  calculateSubtotal,
  calculateDiscount,
  calculateGrandTotal,
  recalculateOrderTotals,
  formatSatangToBaht,
  toBigInt,
} from "@/server/services/calculation.service";
import type { CalculationItem } from "@/server/types";

// All monetary values in tests are in satang (1 baht = 100 satang)
// e.g., 1050n = 10.50 baht, 10000n = 100.00 baht

describe("CalculationService (BigInt)", () => {
  describe("calculateItemTotal", () => {
    it("should calculate item total correctly", () => {
      // 10.50 baht * 3 = 31.50 baht
      const result = calculateItemTotal(1050n, 3);
      expect(result).toBe(3150n);
    });

    it("should handle decimal prices correctly", () => {
      // 19.99 baht * 2 = 39.98 baht
      const result = calculateItemTotal(1999n, 2);
      expect(result).toBe(3998n);
    });

    it("should handle quantity of 1", () => {
      // 100.00 baht * 1 = 100.00 baht
      const result = calculateItemTotal(10000n, 1);
      expect(result).toBe(10000n);
    });

    it("should handle very small prices", () => {
      // 0.01 baht * 100 = 1.00 baht
      const result = calculateItemTotal(1n, 100);
      expect(result).toBe(100n);
    });

    it("should handle large quantities", () => {
      // 9.99 baht * 1000 = 9990.00 baht
      const result = calculateItemTotal(999n, 1000);
      expect(result).toBe(999000n);
    });

    it("should not have floating point errors", () => {
      // BigInt cannot have floating point errors
      // 0.10 baht * 3 = 0.30 baht
      const result = calculateItemTotal(10n, 3);
      expect(result).toBe(30n);
    });
  });

  describe("calculateSubtotal", () => {
    it("should sum all ACTIVE items correctly", () => {
      const items: CalculationItem[] = [
        { pricePerUnit: 1000n, quantity: 2, status: "ACTIVE" }, // 20.00
        { pricePerUnit: 1550n, quantity: 1, status: "ACTIVE" }, // 15.50
      ];
      const result = calculateSubtotal(items);
      expect(result).toBe(3550n); // 35.50 baht
    });

    it("should exclude VOIDED items from subtotal", () => {
      const items: CalculationItem[] = [
        { pricePerUnit: 1000n, quantity: 2, status: "ACTIVE" },  // 20.00
        { pricePerUnit: 10000n, quantity: 1, status: "VOIDED" }, // excluded
        { pricePerUnit: 500n, quantity: 3, status: "ACTIVE" },   // 15.00
      ];
      const result = calculateSubtotal(items);
      expect(result).toBe(3500n); // 35.00 baht
    });

    it("should return 0 for empty items array", () => {
      const result = calculateSubtotal([]);
      expect(result).toBe(0n);
    });

    it("should return 0 when all items are VOIDED", () => {
      const items: CalculationItem[] = [
        { pricePerUnit: 1000n, quantity: 2, status: "VOIDED" },
        { pricePerUnit: 1550n, quantity: 1, status: "VOIDED" },
      ];
      const result = calculateSubtotal(items);
      expect(result).toBe(0n);
    });

    it("should handle mixed types (bigint, string, number)", () => {
      const items: CalculationItem[] = [
        { pricePerUnit: 1000n, quantity: 1, status: "ACTIVE" },   // bigint
        { pricePerUnit: "2000", quantity: 1, status: "ACTIVE" },  // string
        { pricePerUnit: 3000, quantity: 1, status: "ACTIVE" },    // number
      ];
      const result = calculateSubtotal(items);
      expect(result).toBe(6000n); // 60.00 baht
    });
  });

  describe("calculateDiscount", () => {
    it("should calculate percentage discount correctly", () => {
      // 10% of 100.00 baht = 10.00 baht
      const result = calculateDiscount(10000n, "PERCENT", 10n);
      expect(result).toBe(1000n);
    });

    it("should return fixed discount value directly", () => {
      const result = calculateDiscount(10000n, "FIXED", 2500n);
      expect(result).toBe(2500n);
    });

    it("should return 0 when discount type is null", () => {
      const result = calculateDiscount(10000n, null, 10n);
      expect(result).toBe(0n);
    });

    it("should return 0 when discount value is null", () => {
      const result = calculateDiscount(10000n, "PERCENT", null);
      expect(result).toBe(0n);
    });

    it("should handle 0% discount", () => {
      const result = calculateDiscount(10000n, "PERCENT", 0n);
      expect(result).toBe(0n);
    });

    it("should handle 100% discount", () => {
      // 100% of 100.00 baht = 100.00 baht
      const result = calculateDiscount(10000n, "PERCENT", 100n);
      expect(result).toBe(10000n);
    });

    it("should calculate percentage with integer division", () => {
      // 15% of 99.99 baht = 14.9985 baht -> truncates to 14.99 baht (1499 satang)
      const result = calculateDiscount(9999n, "PERCENT", 15n);
      expect(result).toBe(1499n); // Integer division rounds down
    });
  });

  describe("calculateGrandTotal", () => {
    it("should subtract discount from subtotal", () => {
      const result = calculateGrandTotal(10000n, 2000n);
      expect(result).toBe(8000n); // 80.00 baht
    });

    it("should floor at 0 when discount exceeds subtotal", () => {
      const result = calculateGrandTotal(5000n, 10000n);
      expect(result).toBe(0n);
    });

    it("should handle zero discount", () => {
      const result = calculateGrandTotal(10000n, 0n);
      expect(result).toBe(10000n);
    });

    it("should handle zero subtotal", () => {
      const result = calculateGrandTotal(0n, 1000n);
      expect(result).toBe(0n);
    });

    it("should handle equal subtotal and discount", () => {
      const result = calculateGrandTotal(5000n, 5000n);
      expect(result).toBe(0n);
    });
  });

  describe("recalculateOrderTotals", () => {
    it("should calculate all totals correctly", () => {
      const items: CalculationItem[] = [
        { pricePerUnit: 2500n, quantity: 4, status: "ACTIVE" }, // 100.00
        { pricePerUnit: 5000n, quantity: 1, status: "ACTIVE" }, // 50.00
      ];
      const result = recalculateOrderTotals(items, "PERCENT", 10n);

      expect(result.subtotal).toBe(15000n); // 150.00 baht
      expect(result.discount).toBe(1500n);  // 15.00 baht
      expect(result.grandTotal).toBe(13500n); // 135.00 baht
    });

    it("should handle no discount", () => {
      const items: CalculationItem[] = [
        { pricePerUnit: 3000n, quantity: 2, status: "ACTIVE" },
      ];
      const result = recalculateOrderTotals(items, null, null);

      expect(result.subtotal).toBe(6000n);
      expect(result.discount).toBe(0n);
      expect(result.grandTotal).toBe(6000n);
    });

    it("should exclude voided items from calculation", () => {
      const items: CalculationItem[] = [
        { pricePerUnit: 5000n, quantity: 2, status: "ACTIVE" },   // 100.00
        { pricePerUnit: 20000n, quantity: 1, status: "VOIDED" }, // excluded
      ];
      const result = recalculateOrderTotals(items, "FIXED", 2000n);

      expect(result.subtotal).toBe(10000n);   // 100.00 baht
      expect(result.discount).toBe(2000n);    // 20.00 baht
      expect(result.grandTotal).toBe(8000n);  // 80.00 baht
    });

    it("should handle complex scenario with multiple items and percentage discount", () => {
      const items: CalculationItem[] = [
        { pricePerUnit: 1299n, quantity: 3, status: "ACTIVE" },  // 38.97 -> 3897 satang
        { pricePerUnit: 850n, quantity: 2, status: "ACTIVE" },   // 17.00 -> 1700 satang
        { pricePerUnit: 2500n, quantity: 1, status: "VOIDED" },  // excluded
        { pricePerUnit: 1575n, quantity: 4, status: "ACTIVE" },  // 63.00 -> 6300 satang
      ];
      const result = recalculateOrderTotals(items, "PERCENT", 15n);

      // Subtotal: 3897 + 1700 + 6300 = 11897 satang (118.97 baht)
      expect(result.subtotal).toBe(11897n);
      // Discount: 11897 * 15 / 100 = 1784 satang (17.84 baht, truncated)
      expect(result.discount).toBe(1784n);
      // Grand total: 11897 - 1784 = 10113 satang (101.13 baht)
      expect(result.grandTotal).toBe(10113n);
    });
  });

  describe("formatSatangToBaht", () => {
    it("should format satang to baht string", () => {
      expect(formatSatangToBaht(10000n)).toBe("100.00");
      expect(formatSatangToBaht(1050n)).toBe("10.50");
      expect(formatSatangToBaht(99n)).toBe("0.99");
      expect(formatSatangToBaht(1n)).toBe("0.01");
      expect(formatSatangToBaht(0n)).toBe("0.00");
    });
  });

  describe("toBigInt", () => {
    it("should convert various types to bigint", () => {
      expect(toBigInt(100n)).toBe(100n);
      expect(toBigInt(100)).toBe(100n);
      expect(toBigInt("100")).toBe(100n);
    });
  });
});
