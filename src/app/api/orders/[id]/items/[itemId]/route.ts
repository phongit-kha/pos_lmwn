import type { NextRequest } from "next/server";
import {
  successResponse,
  handleError,
  parseJsonBody,
  getRequestId,
} from "@/server/lib/api-response";
import { transformOrder } from "@/server/lib/transformers";
import { updateItemQuantitySchema } from "@/server/validators";
import { updateItemQuantity } from "@/server/services/order.service";

interface RouteParams {
  params: Promise<{
    id: string;
    itemId: string;
  }>;
}

/**
 * @swagger
 * /api/orders/{id}/items/{itemId}:
 *   put:
 *     summary: Update item quantity
 *     description: Update the quantity of an order item. Only allowed in OPEN status.
 *     tags:
 *       - Order Actions
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: New quantity
 *     responses:
 *       200:
 *         description: Item quantity updated successfully
 *       400:
 *         description: Invalid state or validation error
 *       404:
 *         description: Order or item not found
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const requestId = getRequestId(request);
  try {
    const { id: orderId, itemId } = await params;
    const body = await parseJsonBody(request);
    const { quantity } = updateItemQuantitySchema.parse(body);

    const order = await updateItemQuantity(orderId, itemId, quantity);
    return successResponse(transformOrder(order), requestId);
  } catch (error) {
    return handleError(error, requestId);
  }
}
