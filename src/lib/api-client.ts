import type {
  Product,
  Order,
  OrderItem,
  SalesReport,
  DashboardData,
  CategoryBreakdown,
  TopProduct,
  PeakHour,
  TablePerformance,
  VoidAnalysis,
  TodaySummary,
} from "@/types/pos";

// API Error class
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// API Response types from backend
interface ApiProductResponse {
  id: string;
  name: string;
  price: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiOrderItemResponse {
  id: string;
  productId: string;
  productName: string;
  pricePerUnit: string;
  quantity: number;
  batchSequence: number;
  status: "ACTIVE" | "VOIDED";
  voidReason: string | null;
  itemTotal: string;
}

interface ApiOrderResponse {
  id: string;
  tableNumber: number;
  status: "OPEN" | "CONFIRMED" | "PAID" | "CANCELLED";
  subtotal: string;
  discountType: string | null;
  discountValue: string | null;
  grandTotal: string;
  createdAt: string;
  updatedAt: string;
  items: ApiOrderItemResponse[];
}

interface ApiSalesReportResponse {
  summary: {
    totalOrders: number;
    totalSales: string;
    totalDiscount: string;
    netSales: string;
  };
  dailyBreakdown: Array<{
    date: string;
    orderCount: number;
    totalSales: string;
    totalDiscount: string;
    netSales: string;
  }>;
}

// Transform API response to frontend type
// All monetary values from API are in satang (integers)
function toFrontendProduct(api: ApiProductResponse): Product {
  return {
    id: api.id,
    name: api.name,
    price: parseInt(api.price, 10),
    category: api.category,
    isActive: api.isActive,
  };
}

function toFrontendOrderItem(api: ApiOrderItemResponse): OrderItem {
  return {
    id: api.id,
    productId: api.productId,
    productName: api.productName,
    pricePerUnit: parseInt(api.pricePerUnit, 10),
    quantity: api.quantity,
    batchSequence: api.batchSequence,
    status: api.status,
    voidReason: api.voidReason ?? undefined,
    itemTotal: parseInt(api.itemTotal, 10),
  };
}

function toFrontendOrder(api: ApiOrderResponse): Order {
  return {
    id: api.id,
    tableNumber: api.tableNumber,
    status: api.status,
    subtotal: parseInt(api.subtotal, 10),
    discountType: api.discountType as "PERCENT" | "FIXED" | undefined,
    discountValue: api.discountValue
      ? parseInt(api.discountValue, 10)
      : undefined,
    grandTotal: parseInt(api.grandTotal, 10),
    items: api.items.map(toFrontendOrderItem),
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

function toFrontendSalesReport(api: ApiSalesReportResponse): SalesReport {
  return {
    summary: {
      totalOrders: api.summary.totalOrders,
      totalSales: parseInt(api.summary.totalSales, 10),
      totalDiscount: parseInt(api.summary.totalDiscount, 10),
      netSales: parseInt(api.summary.netSales, 10),
    },
    dailyBreakdown: api.dailyBreakdown.map((day) => ({
      date: day.date,
      orderCount: day.orderCount,
      totalSales: parseInt(day.totalSales, 10),
      totalDiscount: parseInt(day.totalDiscount, 10),
      netSales: parseInt(day.netSales, 10),
    })),
  };
}

// API response type
interface ApiResponse<T> {
  data?: T;
  error?: {
    message?: string;
    code?: string;
  };
}

// Generic fetch with error handling
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(endpoint, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const json = (await res.json()) as ApiResponse<T>;

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json.error?.message ?? "Unknown error",
      json.error?.code
    );
  }

  return json.data as T;
}

// Request types
export interface CreateOrderRequest {
  tableNumber: number;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export interface AddItemsRequest {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export interface VoidItemRequest {
  reason: string;
}

export interface CheckoutRequest {
  discountType?: "PERCENT" | "FIXED";
  discountValue?: number;
}

// Products API
export async function getProducts(category?: string): Promise<Product[]> {
  const params = new URLSearchParams({ isActive: "true" });
  if (category) params.set("category", category);

  const data = await fetchApi<ApiProductResponse[]>(
    `/api/products?${params}`
  );

  return data.map(toFrontendProduct);
}

// Orders API
export async function getOrders(params?: {
  tableNumber?: number;
  status?: string;
}): Promise<Order[]> {
  const searchParams = new URLSearchParams();
  if (params?.tableNumber)
    searchParams.set("tableNumber", String(params.tableNumber));
  if (params?.status) searchParams.set("status", params.status);

  const data = await fetchApi<ApiOrderResponse[]>(
    `/api/orders?${searchParams}`
  );
  return data.map(toFrontendOrder);
}

export async function getOrderById(id: string): Promise<Order> {
  const data = await fetchApi<ApiOrderResponse>(`/api/orders/${id}`);
  return toFrontendOrder(data);
}

export async function createOrder(input: CreateOrderRequest): Promise<Order> {
  const data = await fetchApi<ApiOrderResponse>("/api/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return toFrontendOrder(data);
}

export async function addItems(
  orderId: string,
  input: AddItemsRequest
): Promise<Order> {
  const data = await fetchApi<ApiOrderResponse>(`/api/orders/${orderId}/items`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return toFrontendOrder(data);
}

export async function voidItem(
  orderId: string,
  itemId: string,
  input: VoidItemRequest
): Promise<Order> {
  const data = await fetchApi<ApiOrderResponse>(
    `/api/orders/${orderId}/items/${itemId}/void`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
  return toFrontendOrder(data);
}

export async function updateItemQuantity(
  orderId: string,
  itemId: string,
  quantity: number
): Promise<Order> {
  const data = await fetchApi<ApiOrderResponse>(
    `/api/orders/${orderId}/items/${itemId}`,
    {
      method: "PUT",
      body: JSON.stringify({ quantity }),
    }
  );
  return toFrontendOrder(data);
}

export async function confirmOrder(orderId: string): Promise<Order> {
  const data = await fetchApi<ApiOrderResponse>(`/api/orders/${orderId}/confirm`, {
    method: "POST",
  });
  return toFrontendOrder(data);
}

export async function checkoutOrder(
  orderId: string,
  input?: CheckoutRequest
): Promise<Order> {
  const data = await fetchApi<ApiOrderResponse>(`/api/orders/${orderId}/checkout`, {
    method: "POST",
    body: JSON.stringify(input ?? {}),
  });
  return toFrontendOrder(data);
}

export async function cancelOrder(orderId: string): Promise<Order> {
  const data = await fetchApi<ApiOrderResponse>(`/api/orders/${orderId}/cancel`, {
    method: "POST",
  });
  return toFrontendOrder(data);
}

// Reports API
export async function getSalesReport(
  startDate?: string,
  endDate?: string
): Promise<SalesReport> {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  const data = await fetchApi<ApiSalesReportResponse>(
    `/api/reports/sales?${params}`
  );
  return toFrontendSalesReport(data);
}

// Dashboard API Response types
interface ApiCategoryBreakdown {
  category: string;
  orderCount: number;
  totalSales: string;
  itemsSold: number;
  percentage: number;
}

interface ApiTopProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: string;
}

interface ApiPeakHour {
  hour: number;
  orderCount: number;
  totalRevenue: string;
}

interface ApiTablePerformance {
  tableNumber: number;
  orderCount: number;
  totalRevenue: string;
  avgOrderValue: string;
}

interface ApiVoidAnalysis {
  reason: string | null;
  voidCount: number;
  lostRevenue: string;
}

interface ApiTodaySummary {
  today: {
    revenue: string;
    orders: number;
    avgOrderValue: string;
    itemsSold: number;
  };
  comparison: {
    revenueChange: number;
    ordersChange: number;
    avgOrderValueChange: number;
  };
}

interface ApiDashboardResponse {
  salesReport: ApiSalesReportResponse;
  categoryBreakdown: ApiCategoryBreakdown[];
  topProducts: ApiTopProduct[];
  peakHours: ApiPeakHour[];
  tablePerformance: ApiTablePerformance[];
  voidAnalysis: ApiVoidAnalysis[];
  todaySummary: ApiTodaySummary;
}

function toFrontendDashboardData(api: ApiDashboardResponse): DashboardData {
  return {
    salesReport: toFrontendSalesReport(api.salesReport),
    categoryBreakdown: api.categoryBreakdown.map((cat): CategoryBreakdown => ({
      category: cat.category,
      orderCount: cat.orderCount,
      totalSales: parseInt(cat.totalSales, 10),
      itemsSold: cat.itemsSold,
      percentage: cat.percentage,
    })),
    topProducts: api.topProducts.map((prod): TopProduct => ({
      productId: prod.productId,
      productName: prod.productName,
      totalQuantity: prod.totalQuantity,
      totalRevenue: parseInt(prod.totalRevenue, 10),
    })),
    peakHours: api.peakHours.map((hour): PeakHour => ({
      hour: hour.hour,
      orderCount: hour.orderCount,
      totalRevenue: parseInt(hour.totalRevenue, 10),
    })),
    tablePerformance: api.tablePerformance.map((table): TablePerformance => ({
      tableNumber: table.tableNumber,
      orderCount: table.orderCount,
      totalRevenue: parseInt(table.totalRevenue, 10),
      avgOrderValue: parseInt(table.avgOrderValue, 10),
    })),
    voidAnalysis: api.voidAnalysis.map((v): VoidAnalysis => ({
      reason: v.reason,
      voidCount: v.voidCount,
      lostRevenue: parseInt(v.lostRevenue, 10),
    })),
    todaySummary: {
      today: {
        revenue: parseInt(api.todaySummary.today.revenue, 10),
        orders: api.todaySummary.today.orders,
        avgOrderValue: parseInt(api.todaySummary.today.avgOrderValue, 10),
        itemsSold: api.todaySummary.today.itemsSold,
      },
      comparison: api.todaySummary.comparison,
    } as TodaySummary,
  };
}

/**
 * Get comprehensive dashboard data
 */
export async function getDashboardData(
  startDate?: string,
  endDate?: string
): Promise<DashboardData> {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  const data = await fetchApi<ApiDashboardResponse>(
    `/api/reports/dashboard?${params}`
  );
  return toFrontendDashboardData(data);
}
