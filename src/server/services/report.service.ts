import { db } from "@/server/db";
import { Prisma } from "../../../generated/prisma";
import type { SalesReport, SalesReportItem } from "@/server/types";

// ==========================================
// REPORT SERVICE
// ==========================================
// Uses SQL aggregation for efficient reporting
// All monetary values are in satang (BigInt)

interface DateFilters {
  startDate?: Date;
  endDate?: Date;
}

// ==========================================
// Sales Report - Main Summary
// ==========================================

/**
 * Generate sales report for PAID orders only
 * Uses SQL aggregation for efficiency
 */
export async function generateSalesReport(
  filters?: DateFilters
): Promise<SalesReport> {
  // Build date filter conditions
  const dateConditions: Prisma.Sql[] = [];
  if (filters?.startDate) {
    dateConditions.push(Prisma.sql`"createdAt" >= ${filters.startDate}`);
  }
  if (filters?.endDate) {
    dateConditions.push(Prisma.sql`"createdAt" <= ${filters.endDate}`);
  }

  const dateFilter =
    dateConditions.length > 0
      ? Prisma.sql`AND ${Prisma.join(dateConditions, " AND ")}`
      : Prisma.empty;

  // Get summary using SQL aggregation
  const summaryResult = await db.$queryRaw<
    Array<{
      total_orders: bigint;
      total_sales: bigint | null;
      total_discount: bigint | null;
      net_sales: bigint | null;
    }>
  >`
    SELECT 
      COUNT(*)::bigint as total_orders,
      COALESCE(SUM(subtotal), 0)::bigint as total_sales,
      COALESCE(SUM(subtotal - "grandTotal"), 0)::bigint as total_discount,
      COALESCE(SUM("grandTotal"), 0)::bigint as net_sales
    FROM "Order"
    WHERE status = 'PAID' ${dateFilter}
  `;

  // Get daily breakdown using SQL aggregation
  const dailyResult = await db.$queryRaw<
    Array<{
      date: Date;
      order_count: bigint;
      total_sales: bigint;
      total_discount: bigint;
      net_sales: bigint;
    }>
  >`
    SELECT 
      DATE("createdAt") as date,
      COUNT(*)::bigint as order_count,
      COALESCE(SUM(subtotal), 0)::bigint as total_sales,
      COALESCE(SUM(subtotal - "grandTotal"), 0)::bigint as total_discount,
      COALESCE(SUM("grandTotal"), 0)::bigint as net_sales
    FROM "Order"
    WHERE status = 'PAID' ${dateFilter}
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `;

  const summary = summaryResult[0]!;

  const dailyBreakdown: SalesReportItem[] = dailyResult.map((row) => ({
    date: row.date.toISOString().split("T")[0]!,
    orderCount: Number(row.order_count),
    totalSales: row.total_sales.toString(),
    totalDiscount: row.total_discount.toString(),
    netSales: row.net_sales.toString(),
  }));

  return {
    summary: {
      totalOrders: Number(summary.total_orders),
      totalSales: (summary.total_sales ?? 0n).toString(),
      totalDiscount: (summary.total_discount ?? 0n).toString(),
      netSales: (summary.net_sales ?? 0n).toString(),
    },
    dailyBreakdown,
  };
}

// ==========================================
// Category Breakdown
// ==========================================

export interface CategoryBreakdown {
  category: string;
  orderCount: number;
  totalSales: string; // satang
  itemsSold: number;
  percentage: number;
}

/**
 * Get sales breakdown by product category
 */
export async function getCategoryBreakdown(
  filters?: DateFilters
): Promise<CategoryBreakdown[]> {
  const dateConditions: Prisma.Sql[] = [];
  if (filters?.startDate) {
    dateConditions.push(Prisma.sql`o."createdAt" >= ${filters.startDate}`);
  }
  if (filters?.endDate) {
    dateConditions.push(Prisma.sql`o."createdAt" <= ${filters.endDate}`);
  }

  const dateFilter =
    dateConditions.length > 0
      ? Prisma.sql`AND ${Prisma.join(dateConditions, " AND ")}`
      : Prisma.empty;

  const result = await db.$queryRaw<
    Array<{
      category: string;
      order_count: bigint;
      total_sales: bigint;
      items_sold: bigint;
    }>
  >`
    SELECT 
      p.category,
      COUNT(DISTINCT oi."orderId")::bigint as order_count,
      COALESCE(SUM(oi."pricePerUnit" * oi.quantity), 0)::bigint as total_sales,
      COALESCE(SUM(oi.quantity), 0)::bigint as items_sold
    FROM "OrderItem" oi
    JOIN "Order" o ON oi."orderId" = o.id
    JOIN "Product" p ON oi."productId" = p.id
    WHERE o.status = 'PAID' 
      AND oi.status = 'ACTIVE'
      ${dateFilter}
    GROUP BY p.category
    ORDER BY total_sales DESC
  `;

  // Calculate total for percentage
  const total = result.reduce((sum, row) => sum + row.total_sales, 0n);

  return result.map((row) => ({
    category: row.category,
    orderCount: Number(row.order_count),
    totalSales: row.total_sales.toString(),
    itemsSold: Number(row.items_sold),
    percentage: total > 0n ? Number((row.total_sales * 10000n) / total) / 100 : 0,
  }));
}

// ==========================================
// Top Selling Products
// ==========================================

export interface TopProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: string; // satang
}

/**
 * Get top selling products by quantity
 */
export async function getTopProducts(
  limit = 10,
  filters?: DateFilters
): Promise<TopProduct[]> {
  const dateConditions: Prisma.Sql[] = [];
  if (filters?.startDate) {
    dateConditions.push(Prisma.sql`o."createdAt" >= ${filters.startDate}`);
  }
  if (filters?.endDate) {
    dateConditions.push(Prisma.sql`o."createdAt" <= ${filters.endDate}`);
  }

  const dateFilter =
    dateConditions.length > 0
      ? Prisma.sql`AND ${Prisma.join(dateConditions, " AND ")}`
      : Prisma.empty;

  const result = await db.$queryRaw<
    Array<{
      product_id: string;
      product_name: string;
      total_quantity: bigint;
      total_revenue: bigint;
    }>
  >`
    SELECT 
      oi."productId" as product_id,
      oi."productName" as product_name,
      COALESCE(SUM(oi.quantity), 0)::bigint as total_quantity,
      COALESCE(SUM(oi."pricePerUnit" * oi.quantity), 0)::bigint as total_revenue
    FROM "OrderItem" oi
    JOIN "Order" o ON oi."orderId" = o.id
    WHERE o.status = 'PAID' AND oi.status = 'ACTIVE'
      ${dateFilter}
    GROUP BY oi."productId", oi."productName"
    ORDER BY total_quantity DESC
    LIMIT ${limit}
  `;

  return result.map((row) => ({
    productId: row.product_id,
    productName: row.product_name,
    totalQuantity: Number(row.total_quantity),
    totalRevenue: row.total_revenue.toString(),
  }));
}

// ==========================================
// Peak Hours Analysis
// ==========================================

export interface PeakHour {
  hour: number;
  orderCount: number;
  totalRevenue: string; // satang
}

/**
 * Get order distribution by hour of day
 */
export async function getPeakHours(filters?: DateFilters): Promise<PeakHour[]> {
  const dateConditions: Prisma.Sql[] = [];
  if (filters?.startDate) {
    dateConditions.push(Prisma.sql`"createdAt" >= ${filters.startDate}`);
  }
  if (filters?.endDate) {
    dateConditions.push(Prisma.sql`"createdAt" <= ${filters.endDate}`);
  }

  const dateFilter =
    dateConditions.length > 0
      ? Prisma.sql`AND ${Prisma.join(dateConditions, " AND ")}`
      : Prisma.empty;

  const result = await db.$queryRaw<
    Array<{
      hour: number;
      order_count: bigint;
      total_revenue: bigint;
    }>
  >`
    SELECT 
      EXTRACT(HOUR FROM "createdAt")::integer as hour,
      COUNT(*)::bigint as order_count,
      COALESCE(SUM("grandTotal"), 0)::bigint as total_revenue
    FROM "Order"
    WHERE status = 'PAID' ${dateFilter}
    GROUP BY EXTRACT(HOUR FROM "createdAt")
    ORDER BY hour
  `;

  return result.map((row) => ({
    hour: row.hour,
    orderCount: Number(row.order_count),
    totalRevenue: row.total_revenue.toString(),
  }));
}

// ==========================================
// Table Performance
// ==========================================

export interface TablePerformance {
  tableNumber: number;
  orderCount: number;
  totalRevenue: string; // satang
  avgOrderValue: string; // satang
}

/**
 * Get performance metrics by table
 */
export async function getTablePerformance(
  filters?: DateFilters
): Promise<TablePerformance[]> {
  const dateConditions: Prisma.Sql[] = [];
  if (filters?.startDate) {
    dateConditions.push(Prisma.sql`"createdAt" >= ${filters.startDate}`);
  }
  if (filters?.endDate) {
    dateConditions.push(Prisma.sql`"createdAt" <= ${filters.endDate}`);
  }

  const dateFilter =
    dateConditions.length > 0
      ? Prisma.sql`AND ${Prisma.join(dateConditions, " AND ")}`
      : Prisma.empty;

  const result = await db.$queryRaw<
    Array<{
      table_number: number;
      order_count: bigint;
      total_revenue: bigint;
      avg_order_value: bigint;
    }>
  >`
    SELECT 
      "tableNumber" as table_number,
      COUNT(*)::bigint as order_count,
      COALESCE(SUM("grandTotal"), 0)::bigint as total_revenue,
      COALESCE(AVG("grandTotal"), 0)::bigint as avg_order_value
    FROM "Order"
    WHERE status = 'PAID' ${dateFilter}
    GROUP BY "tableNumber"
    ORDER BY total_revenue DESC
  `;

  return result.map((row) => ({
    tableNumber: row.table_number,
    orderCount: Number(row.order_count),
    totalRevenue: row.total_revenue.toString(),
    avgOrderValue: row.avg_order_value.toString(),
  }));
}

// ==========================================
// Void Analysis
// ==========================================

export interface VoidAnalysis {
  reason: string | null;
  voidCount: number;
  lostRevenue: string; // satang
}

/**
 * Get analysis of voided items
 */
export async function getVoidAnalysis(
  filters?: DateFilters
): Promise<VoidAnalysis[]> {
  const dateConditions: Prisma.Sql[] = [];
  if (filters?.startDate) {
    dateConditions.push(Prisma.sql`o."createdAt" >= ${filters.startDate}`);
  }
  if (filters?.endDate) {
    dateConditions.push(Prisma.sql`o."createdAt" <= ${filters.endDate}`);
  }

  const dateFilter =
    dateConditions.length > 0
      ? Prisma.sql`AND ${Prisma.join(dateConditions, " AND ")}`
      : Prisma.empty;

  const result = await db.$queryRaw<
    Array<{
      void_reason: string | null;
      void_count: bigint;
      lost_revenue: bigint;
    }>
  >`
    SELECT 
      oi."voidReason" as void_reason,
      COUNT(*)::bigint as void_count,
      COALESCE(SUM(oi."pricePerUnit" * oi.quantity), 0)::bigint as lost_revenue
    FROM "OrderItem" oi
    JOIN "Order" o ON oi."orderId" = o.id
    WHERE oi.status = 'VOIDED' ${dateFilter}
    GROUP BY oi."voidReason"
    ORDER BY void_count DESC
  `;

  return result.map((row) => ({
    reason: row.void_reason,
    voidCount: Number(row.void_count),
    lostRevenue: row.lost_revenue.toString(),
  }));
}

// ==========================================
// Dashboard Summary
// ==========================================

export interface DashboardSummary {
  today: {
    revenue: string;
    orders: number;
    avgOrderValue: string;
    itemsSold: number;
  };
  comparison: {
    revenueChange: number; // percentage
    ordersChange: number;
    avgOrderValueChange: number;
  };
}

/**
 * Get dashboard summary with today vs yesterday comparison
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Today's stats
  const todayStats = await db.$queryRaw<
    Array<{
      revenue: bigint | null;
      orders: bigint;
      avg_order_value: bigint | null;
      items_sold: bigint | null;
    }>
  >`
    SELECT 
      COALESCE(SUM(o."grandTotal"), 0)::bigint as revenue,
      COUNT(*)::bigint as orders,
      COALESCE(AVG(o."grandTotal"), 0)::bigint as avg_order_value,
      COALESCE((
        SELECT SUM(oi.quantity) 
        FROM "OrderItem" oi 
        WHERE oi."orderId" = ANY(ARRAY_AGG(o.id)) AND oi.status = 'ACTIVE'
      ), 0)::bigint as items_sold
    FROM "Order" o
    WHERE o.status = 'PAID' 
      AND o."createdAt" >= ${today}
      AND o."createdAt" < ${tomorrow}
  `;

  // Yesterday's stats for comparison
  const yesterdayStats = await db.$queryRaw<
    Array<{
      revenue: bigint | null;
      orders: bigint;
      avg_order_value: bigint | null;
    }>
  >`
    SELECT 
      COALESCE(SUM("grandTotal"), 0)::bigint as revenue,
      COUNT(*)::bigint as orders,
      COALESCE(AVG("grandTotal"), 0)::bigint as avg_order_value
    FROM "Order"
    WHERE status = 'PAID' 
      AND "createdAt" >= ${yesterday}
      AND "createdAt" < ${today}
  `;

  const todayData = todayStats[0]!;
  const yesterdayData = yesterdayStats[0]!;

  // Calculate percentage changes
  const revenueChange = yesterdayData.revenue && yesterdayData.revenue > 0n
    ? Number(((todayData.revenue ?? 0n) - yesterdayData.revenue) * 10000n / yesterdayData.revenue) / 100
    : 0;

  const ordersChange = Number(yesterdayData.orders) > 0
    ? ((Number(todayData.orders) - Number(yesterdayData.orders)) / Number(yesterdayData.orders)) * 100
    : 0;

  const avgChange = yesterdayData.avg_order_value && yesterdayData.avg_order_value > 0n
    ? Number(((todayData.avg_order_value ?? 0n) - yesterdayData.avg_order_value) * 10000n / yesterdayData.avg_order_value) / 100
    : 0;

  return {
    today: {
      revenue: (todayData.revenue ?? 0n).toString(),
      orders: Number(todayData.orders),
      avgOrderValue: (todayData.avg_order_value ?? 0n).toString(),
      itemsSold: Number(todayData.items_sold ?? 0),
    },
    comparison: {
      revenueChange: Math.round(revenueChange * 10) / 10,
      ordersChange: Math.round(ordersChange * 10) / 10,
      avgOrderValueChange: Math.round(avgChange * 10) / 10,
    },
  };
}
