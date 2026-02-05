import type { NextRequest } from "next/server";
import {
  successResponse,
  handleError,
  getRequestId,
} from "@/server/lib/api-response";
import { salesReportFilterSchema } from "@/server/validators";
import {
  generateSalesReport,
  getCategoryBreakdown,
  getTopProducts,
  getPeakHours,
  getTablePerformance,
  getVoidAnalysis,
  getDashboardSummary,
} from "@/server/services/report.service";

/**
 * @swagger
 * /api/reports/dashboard:
 *   get:
 *     summary: Get comprehensive dashboard data
 *     description: Returns all dashboard analytics including sales summary, category breakdown, top products, peak hours, table performance, and void analysis.
 *     tags:
 *       - Reports
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for the report period
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for the report period
 *     responses:
 *       200:
 *         description: Dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     salesReport:
 *                       type: object
 *                     categoryBreakdown:
 *                       type: array
 *                     topProducts:
 *                       type: array
 *                     peakHours:
 *                       type: array
 *                     tablePerformance:
 *                       type: array
 *                     voidAnalysis:
 *                       type: array
 *                     todaySummary:
 *                       type: object
 */
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const { searchParams } = new URL(request.url);

    const filters = salesReportFilterSchema.parse({
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
    });

    const dateFilters = {
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    };

    // Fetch all dashboard data in parallel
    const [
      salesReport,
      categoryBreakdown,
      topProducts,
      peakHours,
      tablePerformance,
      voidAnalysis,
      todaySummary,
    ] = await Promise.all([
      generateSalesReport(dateFilters),
      getCategoryBreakdown(dateFilters),
      getTopProducts(10, dateFilters),
      getPeakHours(dateFilters),
      getTablePerformance(dateFilters),
      getVoidAnalysis(dateFilters),
      getDashboardSummary(),
    ]);

    return successResponse(
      {
        salesReport,
        categoryBreakdown,
        topProducts,
        peakHours,
        tablePerformance,
        voidAnalysis,
        todaySummary,
      },
      requestId
    );
  } catch (error) {
    return handleError(error, requestId);
  }
}
