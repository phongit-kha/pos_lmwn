import type { NextRequest } from "next/server";
import {
  successResponse,
  handleError,
  parseJsonBody,
} from "@/server/lib/api-response";
import { transformOrder } from "@/server/lib/transformers";
import { addItemsSchema } from "@/server/validators";
import { addItemsToOrder } from "@/server/services/order.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * @swagger
 * /api/orders/{id}/items:
 *   post:
 *     summary: Add items to an existing order
 *     description: Add new items to an order (batch ordering). Creates a new batch sequence.
 *     tags:
 *       - Order Actions
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
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
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *     responses:
 *       200:
 *         description: Items added successfully
 *       400:
 *         description: Invalid state or validation error
 *       404:
 *         description: Order or product not found
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await parseJsonBody(request);
    const validatedData = addItemsSchema.parse(body);

    const order = await addItemsToOrder(id, validatedData);
    return successResponse(transformOrder(order));
  } catch (error) {
    return handleError(error);
  }
}
