import type { NextRequest } from "next/server";
import {
  successResponse,
  handleError,
} from "@/server/lib/api-response";
import { salesReportFilterSchema } from "@/server/validators";
import { generateSalesReport } from "@/server/services/report.service";

/**
 * @swagger
 * /api/reports/sales:
 *   get:
 *     summary: Get sales report
 *     description: Aggregate sales data for PAID orders only, grouped by date
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
 *         description: Sales report
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
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalOrders:
 *                           type: integer
 *                         totalSales:
 *                           type: string
 *                         totalDiscount:
 *                           type: string
 *                         netSales:
 *                           type: string
 *                     dailyBreakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           orderCount:
 *                             type: integer
 *                           totalSales:
 *                             type: string
 *                           totalDiscount:
 *                             type: string
 *                           netSales:
 *                             type: string
 *       400:
 *         description: Invalid query parameters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters = salesReportFilterSchema.parse({
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
    });

    const report = await generateSalesReport({
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    });

    return successResponse(report);
  } catch (error) {
    return handleError(error);
  }
}
