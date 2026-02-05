import type { NextRequest } from "next/server";
import {
  successResponse,
  handleError,
  parseJsonBody,
  getRequestId,
} from "@/server/lib/api-response";
import { transformOrder } from "@/server/lib/transformers";
import { createOrderSchema } from "@/server/validators";
import { parseOrderFilters } from "@/server/validators/pagination.validator";
import { createOrder, listOrdersWithItems } from "@/server/services/order.service";

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     description: Create a new order with initial items. Opens a new table.
 *     tags:
 *       - Orders
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tableNumber
 *               - items
 *             properties:
 *               tableNumber:
 *                 type: integer
 *                 minimum: 1
 *                 description: Table number
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: string
 *                       description: Product ID
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                       description: Quantity
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Product not found
 */
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const body = await parseJsonBody(request);
    const validatedData = createOrderSchema.parse(body);

    const order = await createOrder(validatedData);
    return successResponse(transformOrder(order), requestId, { status: 201 });
  } catch (error) {
    return handleError(error, requestId);
  }
}

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: List orders
 *     description: Get a paginated list of orders with optional filters. Returns lean list items for efficiency.
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, CONFIRMED, PAID, CANCELLED]
 *         description: Filter by order status
 *       - in: query
 *         name: tableNumber
 *         schema:
 *           type: integer
 *         description: Filter by table number
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter orders created after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter orders created before this date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Paginated list of orders
 *       400:
 *         description: Invalid query parameters
 */
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const { searchParams } = new URL(request.url);
    const filters = parseOrderFilters(searchParams);

    // Use listOrdersWithItems to get full orders with items
    // This is needed for frontend display
    const orders = await listOrdersWithItems({
      status: filters.status,
      tableNumber: filters.tableNumber,
      startDate: filters.startDate,
      endDate: filters.endDate,
    });

    // Transform orders to API response format
    const transformedOrders = orders.map(transformOrder);

    return successResponse(transformedOrders, requestId);
  } catch (error) {
    return handleError(error, requestId);
  }
}
