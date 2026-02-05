import type { NextRequest } from "next/server";
import {
  successResponse,
  handleError,
  parseJsonBody,
} from "@/server/lib/api-response";
import { transformOrder } from "@/server/lib/transformers";
import { voidItemSchema } from "@/server/validators";
import { voidOrderItem } from "@/server/services/order.service";

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

/**
 * @swagger
 * /api/orders/{id}/items/{itemId}/void:
 *   patch:
 *     summary: Void an order item
 *     description: Soft delete an item with a mandatory reason. Only allowed in CONFIRMED status.
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
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 minLength: 1
 *                 description: Reason for voiding the item
 *     responses:
 *       200:
 *         description: Item voided successfully
 *       400:
 *         description: Invalid state or validation error
 *       404:
 *         description: Order or item not found
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id, itemId } = await params;
    const body = await parseJsonBody(request);
    const validatedData = voidItemSchema.parse(body);

    const order = await voidOrderItem(id, itemId, validatedData);
    return successResponse(transformOrder(order));
  } catch (error) {
    return handleError(error);
  }
}
