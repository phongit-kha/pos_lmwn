import type { NextRequest } from "next/server";
import {
  successResponse,
  handleError,
  getRequestId,
  NotFoundError,
} from "@/server/lib/api-response";
import { transformOrder } from "@/server/lib/transformers";
import { getOrderById } from "@/server/services/order.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     description: Get full order details including items and financial summary
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestId = getRequestId(request);
  try {
    const { id } = await params;
    const order = await getOrderById(id);

    if (!order) {
      throw new NotFoundError("Order", id);
    }

    return successResponse(transformOrder(order), requestId);
  } catch (error) {
    return handleError(error, requestId);
  }
}
