import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert baht to satang for internal storage/API
 * 1 baht = 100 satang
 * @example toSatang(100) => 10000
 */
export function toSatang(baht: number): number {
  return Math.round(baht * 100);
}

/**
 * Convert satang to baht for display
 * 1 baht = 100 satang
 * @example toBaht(10000) => 100
 */
export function toBaht(satang: number): number {
  return satang / 100;
}

/**
 * Format satang amount as baht for display
 * @param amount - Amount in satang (e.g., 10000 = 100 บาท)
 * @returns Formatted string with baht symbol (e.g., "100.00 บาท")
 */
export function formatCurrency(amount: number | string): string {
  const satang = typeof amount === "string" ? parseInt(amount, 10) : amount;
  const baht = toBaht(satang);
  return `${baht.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;
}
