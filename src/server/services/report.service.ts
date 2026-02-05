import Decimal from "decimal.js";
import { db } from "@/server/db";
import type { SalesReport, SalesReportItem } from "@/server/types";

interface SalesReportFilters {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Generate sales report for PAID orders only
 */
export async function generateSalesReport(
  filters?: SalesReportFilters
): Promise<SalesReport> {
  const where: Record<string, unknown> = {
    status: "PAID",
  };

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      (where.createdAt as Record<string, Date>).gte = filters.startDate;
    }
    if (filters.endDate) {
      (where.createdAt as Record<string, Date>).lte = filters.endDate;
    }
  }

  // Fetch all paid orders within the date range
  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: "asc" },
  });

  // Calculate totals
  let totalSales = new Decimal(0);
  let totalDiscount = new Decimal(0);
  let netSales = new Decimal(0);

  // Group by date for daily breakdown
  const dailyMap = new Map<
    string,
    {
      orderCount: number;
      totalSales: Decimal;
      totalDiscount: Decimal;
      netSales: Decimal;
    }
  >();

  for (const order of orders) {
    const dateKey = order.createdAt.toISOString().split("T")[0]!;
    const subtotal = new Decimal(order.subtotal.toString());
    const grandTotal = new Decimal(order.grandTotal.toString());
    const discount = subtotal.minus(grandTotal);

    totalSales = totalSales.plus(subtotal);
    totalDiscount = totalDiscount.plus(discount);
    netSales = netSales.plus(grandTotal);

    const existing = dailyMap.get(dateKey);
    if (existing) {
      existing.orderCount++;
      existing.totalSales = existing.totalSales.plus(subtotal);
      existing.totalDiscount = existing.totalDiscount.plus(discount);
      existing.netSales = existing.netSales.plus(grandTotal);
    } else {
      dailyMap.set(dateKey, {
        orderCount: 1,
        totalSales: subtotal,
        totalDiscount: discount,
        netSales: grandTotal,
      });
    }
  }

  // Convert daily map to array
  const dailyBreakdown: SalesReportItem[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      orderCount: data.orderCount,
      totalSales: data.totalSales.toFixed(2),
      totalDiscount: data.totalDiscount.toFixed(2),
      netSales: data.netSales.toFixed(2),
    }));

  return {
    summary: {
      totalOrders: orders.length,
      totalSales: totalSales.toFixed(2),
      totalDiscount: totalDiscount.toFixed(2),
      netSales: netSales.toFixed(2),
    },
    dailyBreakdown,
  };
}
