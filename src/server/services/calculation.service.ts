import type { CalculationItem } from "@/server/types";

// ==========================================
// FINANCIAL CALCULATION SERVICE
// ==========================================
// All monetary values are in satang (1 baht = 100 satang)
// Example: 100 baht = 10000 satang
//
// Using BigInt for:
// - Precise integer arithmetic (no floating-point errors)
// - Direct compatibility with database BigInt columns
// - Safe for financial calculations

/**
 * Calculate total for a single item (price × quantity)
 * @param pricePerUnit - Price per unit in satang (BigInt)
 * @param quantity - Quantity (number)
 * @returns Total in satang (BigInt)
 */
export function calculateItemTotal(
  pricePerUnit: bigint,
  quantity: number
): bigint {
  return pricePerUnit * BigInt(quantity);
}

/**
 * Calculate subtotal from all ACTIVE items only
 * Excludes VOIDED items from calculation
 * @param items - Array of items with pricePerUnit, quantity, and status
 * @returns Subtotal in satang (BigInt)
 */
export function calculateSubtotal(items: CalculationItem[]): bigint {
  return items
    .filter((item) => item.status === "ACTIVE")
    .reduce((sum, item) => {
      const price = toBigInt(item.pricePerUnit);
      return sum + calculateItemTotal(price, item.quantity);
    }, 0n);
}

/**
 * Calculate discount amount based on type and value
 * - PERCENT: subtotal × (value / 100) - value is whole percentage (10 = 10%)
 * - FIXED: returns the fixed value directly (already in satang)
 *
 * @param subtotal - Subtotal in satang (BigInt)
 * @param type - "PERCENT" or "FIXED"
 * @param value - Discount value (percentage for PERCENT, satang for FIXED)
 * @returns Discount amount in satang (BigInt)
 */
export function calculateDiscount(
  subtotal: bigint,
  type: string | null,
  value: bigint | null
): bigint {
  if (!type || value === null) {
    return 0n;
  }

  if (type === "PERCENT") {
    // value is whole percentage (e.g., 10 for 10%)
    // Calculate: subtotal * percentage / 100
    return (subtotal * value) / 100n;
  }

  // FIXED discount - value is already in satang
  return value;
}

/**
 * Calculate grand total (subtotal - discount)
 * Floors at 0 to prevent negative totals
 *
 * @param subtotal - Subtotal in satang (BigInt)
 * @param discount - Discount in satang (BigInt)
 * @returns Grand total in satang (BigInt)
 */
export function calculateGrandTotal(
  subtotal: bigint,
  discount: bigint
): bigint {
  const total = subtotal - discount;
  return total > 0n ? total : 0n;
}

/**
 * Recalculate all order totals from items
 * Returns subtotal, discount, and grandTotal
 *
 * @param items - Array of items
 * @param discountType - "PERCENT" or "FIXED" or null
 * @param discountValue - Discount value or null
 * @returns Object with subtotal, discount, and grandTotal (all BigInt)
 */
export function recalculateOrderTotals(
  items: CalculationItem[],
  discountType: string | null,
  discountValue: bigint | string | number | null
): {
  subtotal: bigint;
  discount: bigint;
  grandTotal: bigint;
} {
  const subtotal = calculateSubtotal(items);
  const discountBigInt = discountValue !== null ? toBigInt(discountValue) : null;
  const discount = calculateDiscount(subtotal, discountType, discountBigInt);
  const grandTotal = calculateGrandTotal(subtotal, discount);

  return {
    subtotal,
    discount,
    grandTotal,
  };
}

// ==========================================
// Conversion Helpers
// ==========================================

/**
 * Convert various types to BigInt safely
 * Handles: bigint, number, string, Decimal
 *
 * @param value - Value to convert
 * @returns BigInt value
 */
export function toBigInt(value: bigint | string | number | { toString(): string }): bigint {
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number") {
    // Ensure we're dealing with integers
    return BigInt(Math.round(value));
  }
  if (typeof value === "string") {
    // Handle string representation (might have decimal point from DB)
    const parsed = parseFloat(value);
    return BigInt(Math.round(parsed));
  }
  // Handle Decimal.js or other objects with toString()
  return BigInt(Math.round(parseFloat(value.toString())));
}

/**
 * Convert BigInt to string for API response
 * Values are in satang (integers)
 *
 * @param value - BigInt value in satang
 * @returns String representation
 */
export function toSatangString(value: bigint): string {
  return value.toString();
}

/**
 * Format satang as Thai Baht for display
 * Example: 10000n -> "100.00"
 *
 * @param satang - Amount in satang (BigInt)
 * @returns Formatted string in baht with 2 decimal places
 */
export function formatSatangToBaht(satang: bigint): string {
  const baht = Number(satang) / 100;
  return baht.toFixed(2);
}

/**
 * Convert Thai Baht to satang
 * Example: 100.00 -> 10000n
 *
 * @param baht - Amount in baht
 * @returns Amount in satang (BigInt)
 */
export function bahtToSatang(baht: number): bigint {
  return BigInt(Math.round(baht * 100));
}
