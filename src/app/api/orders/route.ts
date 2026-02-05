import type { NextRequest } from "next/server";
import {
  successResponse,
  handleError,
  parseJsonBody,
} from "@/server/lib/api-response";
import { transformOrder, transformOrderListItem } from "@/server/lib/transformers";
import { createOrderSchema, orderListFilterSchema } from "@/server/validators";
import { createOrder, listOrders } from "@/server/services/order.service";
import type { OrderStatus } from "@/server/types";

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
  try {
    const body = await parseJsonBody(request);
    const validatedData = createOrderSchema.parse(body);

    const order = await createOrder(validatedData);
    return successResponse(transformOrder(order), 201);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: List orders
 *     description: Get a list of orders with optional filters
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
 *     responses:
 *       200:
 *         description: List of orders
 *       400:
 *         description: Invalid query parameters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = orderListFilterSchema.parse({
      status: searchParams.get("status") ?? undefined,
      tableNumber: searchParams.get("tableNumber") ?? undefined,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
    });

    const orders = await listOrders({
      status: filters.status as OrderStatus | undefined,
      tableNumber: filters.tableNumber,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    });

    return successResponse(orders.map(transformOrderListItem));
  } catch (error) {
    return handleError(error);
  }
}
