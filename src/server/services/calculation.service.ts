import Decimal from "decimal.js";
import type { CalculationItem } from "@/server/types";

// Configure Decimal.js for financial calculations
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
});

/**
 * Calculate total for a single item (price × quantity)
 */
export function calculateItemTotal(
  pricePerUnit: Decimal,
  quantity: number
): Decimal {
  return pricePerUnit.times(quantity);
}

/**
 * Calculate subtotal from all ACTIVE items only
 * Excludes VOIDED items from calculation
 */
export function calculateSubtotal(items: CalculationItem[]): Decimal {
  return items
    .filter((item) => item.status === "ACTIVE")
    .reduce((sum, item) => {
      const price = new Decimal(item.pricePerUnit);
      return sum.plus(calculateItemTotal(price, item.quantity));
    }, new Decimal(0));
}

/**
 * Calculate discount amount based on type and value
 * - PERCENT: subtotal × (value / 100)
 * - FIXED: returns the fixed value directly
 */
export function calculateDiscount(
  subtotal: Decimal,
  type: string | null,
  value: Decimal | null
): Decimal {
  if (!type || !value) {
    return new Decimal(0);
  }

  if (type === "PERCENT") {
    return subtotal.times(value).dividedBy(100);
  }

  // FIXED discount
  return value;
}

/**
 * Calculate grand total (subtotal - discount)
 * Floors at 0.00 to prevent negative totals
 */
export function calculateGrandTotal(
  subtotal: Decimal,
  discount: Decimal
): Decimal {
  const total = subtotal.minus(discount);
  return Decimal.max(total, new Decimal(0));
}

/**
 * Recalculate all order totals from items
 * Returns subtotal, discount, and grandTotal
 */
export function recalculateOrderTotals(
  items: CalculationItem[],
  discountType: string | null,
  discountValue: Decimal | string | number | null
): {
  subtotal: Decimal;
  discount: Decimal;
  grandTotal: Decimal;
} {
  const subtotal = calculateSubtotal(items);
  const discountDecimal = discountValue ? new Decimal(discountValue) : null;
  const discount = calculateDiscount(subtotal, discountType, discountDecimal);
  const grandTotal = calculateGrandTotal(subtotal, discount);

  return {
    subtotal,
    discount,
    grandTotal,
  };
}

/**
 * Convert Decimal to string for database storage
 * Uses 2 decimal places for currency
 */
export function toDecimalString(value: Decimal): string {
  return value.toFixed(2);
}

/**
 * Convert string/number to Decimal
 */
export function toDecimal(value: string | number | Decimal): Decimal {
  return new Decimal(value);
}
