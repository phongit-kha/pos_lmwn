import type { NextRequest } from "next/server";
import {
  successResponse,
  handleError,
} from "@/server/lib/api-response";
import { transformOrder } from "@/server/lib/transformers";
import { confirmOrder } from "@/server/services/order.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * @swagger
 * /api/orders/{id}/confirm:
 *   post:
 *     summary: Confirm an order
 *     description: Lock the order and notify the kitchen. Changes status from OPEN to CONFIRMED.
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
 *         description: Order confirmed successfully
 *       400:
 *         description: Invalid state (order not in OPEN status)
 *       404:
 *         description: Order not found
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const order = await confirmOrder(id);
    return successResponse(transformOrder(order));
  } catch (error) {
    return handleError(error);
  }
}
