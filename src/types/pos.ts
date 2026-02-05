// Re-export enums from server types for consistency
export type OrderStatus = "OPEN" | "CONFIRMED" | "PAID" | "CANCELLED";
export type OrderItemStatus = "ACTIVE" | "VOIDED";

// Frontend-friendly types (numbers instead of Decimal strings)
export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  isActive: boolean;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  pricePerUnit: number;
  quantity: number;
  batchSequence: number;
  status: OrderItemStatus;
  voidReason?: string;
  itemTotal: number;
}

export interface Order {
  id: string;
  tableNumber: number;
  status: OrderStatus;
  subtotal: number;
  discountType?: "PERCENT" | "FIXED";
  discountValue?: number;
  grandTotal: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

// Dashboard types
export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalItems: number;
  totalDiscounts: number;
  openOrders: number;
  confirmedOrders: number;
  paidOrders: number;
  cancelledOrders: number;
}

export interface SalesReportSummary {
  totalOrders: number;
  totalSales: number;
  totalDiscount: number;
  netSales: number;
}

export interface DailyBreakdown {
  date: string;
  orderCount: number;
  totalSales: number;
  totalDiscount: number;
  netSales: number;
}

export interface SalesReport {
  summary: SalesReportSummary;
  dailyBreakdown: DailyBreakdown[];
}

// Enhanced Dashboard Types
export interface CategoryBreakdown {
  category: string;
  orderCount: number;
  totalSales: number;
  itemsSold: number;
  percentage: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface PeakHour {
  hour: number;
  orderCount: number;
  totalRevenue: number;
}

export interface TablePerformance {
  tableNumber: number;
  orderCount: number;
  totalRevenue: number;
  avgOrderValue: number;
}

export interface VoidAnalysis {
  reason: string | null;
  voidCount: number;
  lostRevenue: number;
}

export interface TodaySummary {
  today: {
    revenue: number;
    orders: number;
    avgOrderValue: number;
    itemsSold: number;
  };
  comparison: {
    revenueChange: number;
    ordersChange: number;
    avgOrderValueChange: number;
  };
}

export interface DashboardData {
  salesReport: SalesReport;
  categoryBreakdown: CategoryBreakdown[];
  topProducts: TopProduct[];
  peakHours: PeakHour[];
  tablePerformance: TablePerformance[];
  voidAnalysis: VoidAnalysis[];
  todaySummary: TodaySummary;
}
