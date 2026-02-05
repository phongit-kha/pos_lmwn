"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getDashboardData } from "@/lib/api-client";
import { useOrders } from "@/hooks/use-orders";
import { formatCurrency } from "@/lib/utils";
import { StatCard } from "./StatCard";
import type { DashboardData, Order } from "@/types/pos";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Package,
  Tag,
  Clock,
  CheckCircle,
  CreditCard,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Utensils,
  Trophy,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const COLORS = ["#1a1a1a", "#4a4a4a", "#7a7a7a", "#a0a0a0", "#c0c0c0"];

/**
 * Format hour for display (e.g., 14 -> "2PM")
 */
function formatHour(hour: number): string {
  if (hour === 0) return "12AM";
  if (hour === 12) return "12PM";
  if (hour < 12) return `${hour}AM`;
  return `${hour - 12}PM`;
}

/**
 * Get trend indicator component
 */
function TrendIndicator({ value, suffix = "%" }: { value: number; suffix?: string }) {
  if (value === 0) return null;
  const isPositive = value > 0;
  return (
    <span className={`flex items-center text-xs ${isPositive ? "text-green-600" : "text-red-600"}`}>
      {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
      {isPositive ? "+" : ""}{value}{suffix}
    </span>
  );
}

export function DashboardPage() {
  const { orders, isLoading: ordersLoading } = useOrders();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setError(null);
        const data = await getDashboardData();
        setDashboardData(data);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    void fetchDashboard();
  }, []);

  const calculateOrderStats = (orders: Order[]) => {
    return {
      openOrders: orders.filter((o) => o.status === "OPEN").length,
      confirmedOrders: orders.filter((o) => o.status === "CONFIRMED").length,
      paidOrders: orders.filter((o) => o.status === "PAID").length,
      cancelledOrders: orders.filter((o) => o.status === "CANCELLED").length,
    };
  };

  const orderStats = calculateOrderStats(orders);

  // Prepare chart data
  const dailyChartData = dashboardData?.salesReport.dailyBreakdown.map((day) => ({
    date: day.date.slice(5), // Show MM-DD
    sales: day.netSales,
    orders: day.orderCount,
  })) ?? [];

  const categoryData = dashboardData?.categoryBreakdown.map((cat) => ({
    name: cat.category,
    value: cat.totalSales,
    percentage: cat.percentage,
  })) ?? [];

  const peakHoursData = dashboardData?.peakHours.map((h) => ({
    hour: formatHour(h.hour),
    orders: h.orderCount,
    revenue: h.totalRevenue,
  })) ?? [];

  if (isLoading || ordersLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-destructive">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  const todaySummary = dashboardData?.todaySummary;

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Tables
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Real-time sales analytics and performance insights
        </p>
      </div>

      {/* Today's Summary with Comparison */}
      {todaySummary && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Today&apos;s Performance</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Today's Revenue"
              value={formatCurrency(todaySummary.today.revenue)}
              icon={DollarSign}
              subtitle={<TrendIndicator value={todaySummary.comparison.revenueChange} />}
            />
            <StatCard
              title="Today's Orders"
              value={todaySummary.today.orders}
              icon={ShoppingCart}
              subtitle={<TrendIndicator value={todaySummary.comparison.ordersChange} />}
            />
            <StatCard
              title="Avg Order Value"
              value={formatCurrency(todaySummary.today.avgOrderValue)}
              icon={TrendingUp}
              subtitle={<TrendIndicator value={todaySummary.comparison.avgOrderValueChange} />}
            />
            <StatCard
              title="Items Sold Today"
              value={todaySummary.today.itemsSold}
              icon={Package}
              subtitle="vs yesterday"
            />
          </div>
        </div>
      )}

      {/* Overall Stats */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">All-Time Summary</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(dashboardData?.salesReport.summary.netSales ?? 0)}
            icon={DollarSign}
            subtitle={`${dashboardData?.salesReport.summary.totalOrders ?? 0} total orders`}
          />
          <StatCard
            title="Total Sales"
            value={formatCurrency(dashboardData?.salesReport.summary.totalSales ?? 0)}
            icon={CreditCard}
            subtitle="Before discounts"
          />
          <StatCard
            title="Total Discounts"
            value={formatCurrency(dashboardData?.salesReport.summary.totalDiscount ?? 0)}
            icon={Tag}
            subtitle="Applied to orders"
          />
          <StatCard
            title="Avg Per Order"
            value={formatCurrency(
              dashboardData?.salesReport.summary.totalOrders
                ? (dashboardData.salesReport.summary.netSales / dashboardData.salesReport.summary.totalOrders)
                : 0
            )}
            icon={TrendingUp}
            subtitle="Average basket size"
          />
        </div>
      </div>

      {/* Order Status Stats */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Current Order Status</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Open Orders" value={orderStats.openOrders} icon={Clock} />
          <StatCard title="Confirmed" value={orderStats.confirmedOrders} icon={CheckCircle} />
          <StatCard title="Paid" value={orderStats.paidOrders} icon={CreditCard} />
          <StatCard title="Cancelled" value={orderStats.cancelledOrders} icon={ShoppingCart} />
        </div>
      </div>

      {/* Charts Row */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Daily Sales Chart */}
        <div className="rounded-lg border bg-card p-6 lg:col-span-2">
          <h3 className="mb-4 text-lg font-semibold">Daily Sales Trend</h3>
          {dailyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="date" stroke="currentColor" opacity={0.5} />
                <YAxis stroke="currentColor" opacity={0.5} />
                <Tooltip
                  formatter={(value, name) => [
                    name === "sales" ? formatCurrency(Number(value)) : value,
                    name === "sales" ? "Revenue" : "Orders",
                  ]}
                />
                <Bar dataKey="sales" fill="currentColor" opacity={0.8} name="sales" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              No sales data available
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Sales by Category</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#4a4a4a"
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              No category data
            </div>
          )}
        </div>
      </div>

      {/* Second Charts Row */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Peak Hours Chart */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Peak Hours Analysis
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Best time to schedule extra staff
          </p>
          {peakHoursData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={peakHoursData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="hour" stroke="currentColor" opacity={0.5} />
                <YAxis stroke="currentColor" opacity={0.5} />
                <Tooltip formatter={(value, name) => [
                  name === "revenue" ? formatCurrency(Number(value)) : value,
                  name === "revenue" ? "Revenue" : "Orders"
                ]} />
                <Line type="monotone" dataKey="orders" stroke="currentColor" strokeWidth={2} dot={{ fill: "currentColor" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-muted-foreground">
              No peak hours data
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top Selling Products
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Most popular items by quantity sold
          </p>
          {dashboardData?.topProducts && dashboardData.topProducts.length > 0 ? (
            <div className="space-y-3 max-h-[250px] overflow-y-auto">
              {dashboardData.topProducts.slice(0, 5).map((product, index) => (
                <div key={product.productId} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="font-medium">{product.productName}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{product.totalQuantity} sold</div>
                    <div className="text-xs text-muted-foreground">{formatCurrency(product.totalRevenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-muted-foreground">
              No product data
            </div>
          )}
        </div>
      </div>

      {/* Third Row: Table Performance & Void Analysis */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Table Performance */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Table Performance
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Revenue by table - identify high-performing areas
          </p>
          {dashboardData?.tablePerformance && dashboardData.tablePerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-2 py-2 text-left font-medium">Table</th>
                    <th className="px-2 py-2 text-right font-medium">Orders</th>
                    <th className="px-2 py-2 text-right font-medium">Revenue</th>
                    <th className="px-2 py-2 text-right font-medium">Avg Value</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.tablePerformance.slice(0, 6).map((table) => (
                    <tr key={table.tableNumber} className="border-b hover:bg-muted/50">
                      <td className="px-2 py-2 font-medium">Table {table.tableNumber}</td>
                      <td className="px-2 py-2 text-right">{table.orderCount}</td>
                      <td className="px-2 py-2 text-right">{formatCurrency(table.totalRevenue)}</td>
                      <td className="px-2 py-2 text-right">{formatCurrency(table.avgOrderValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No table data
            </div>
          )}
        </div>

        {/* Void Analysis */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Void Analysis
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Track voided items to reduce waste
          </p>
          {dashboardData?.voidAnalysis && dashboardData.voidAnalysis.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.voidAnalysis.map((v, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
                  <div>
                    <div className="font-medium">{v.reason ?? "No reason provided"}</div>
                    <div className="text-sm text-muted-foreground">{v.voidCount} items voided</div>
                  </div>
                  <div className="text-right text-destructive font-semibold">
                    -{formatCurrency(v.lostRevenue)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No voided items - great job!
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Recent Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left font-medium">Order ID</th>
                <th className="px-4 py-2 text-left font-medium">Table</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Items</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 10).map((order) => (
                <tr key={order.id} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-2 font-mono text-xs">
                    {order.id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-2">Table {order.tableNumber}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        order.status === "PAID"
                          ? "bg-foreground text-background"
                          : order.status === "CONFIRMED"
                            ? "bg-foreground/70 text-background"
                            : order.status === "OPEN"
                              ? "bg-muted text-foreground"
                              : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {order.items.filter((i) => i.status === "ACTIVE").length} items
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    {formatCurrency(order.grandTotal)}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No orders yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
