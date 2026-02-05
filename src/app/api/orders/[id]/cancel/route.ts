import type { NextRequest } from "next/server";
import {
  successResponse,
  handleError,
  getRequestId,
} from "@/server/lib/api-response";
import { transformOrder } from "@/server/lib/transformers";
import { cancelOrder } from "@/server/services/order.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   post:
 *     summary: Cancel an order
 *     description: Cancel the order. Changes status to CANCELLED. Can only cancel OPEN or CONFIRMED orders.
 *     tags:
 *       - Order Actions
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *       400:
 *         description: Invalid state (order already PAID or CANCELLED)
 *       404:
 *         description: Order not found
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const requestId = getRequestId(request);
  try {
    const { id } = await params;
    const order = await cancelOrder(id);
    return successResponse(transformOrder(order), requestId);
  } catch (error) {
    return handleError(error, requestId);
  }
}
