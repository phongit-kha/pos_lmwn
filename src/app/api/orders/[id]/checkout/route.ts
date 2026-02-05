import type { NextRequest } from "next/server";
import {
  successResponse,
  handleError,
} from "@/server/lib/api-response";
import { transformOrder } from "@/server/lib/transformers";
import { checkoutSchema } from "@/server/validators";
import { checkoutOrder } from "@/server/services/order.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * @swagger
 * /api/orders/{id}/checkout:
 *   post:
 *     summary: Checkout an order
 *     description: Finalize the transaction with optional discount. Changes status from CONFIRMED to PAID.
 *     tags:
 *       - Payment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               discountType:
 *                 type: string
 *                 enum: [PERCENT, FIXED]
 *                 description: Type of discount to apply
 *               discountValue:
 *                 type: number
 *                 minimum: 0
 *                 description: Discount value (percentage 0-100 or fixed amount)
 *     responses:
 *       200:
 *         description: Order checked out successfully
 *       400:
 *         description: Invalid state or validation error
 *       404:
 *         description: Order not found
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    
    // Parse body, default to empty object if no body
    let body: { discountType?: "PERCENT" | "FIXED"; discountValue?: number } = {};
    try {
      body = await request.json() as typeof body;
    } catch {
      // No body provided, use defaults
    }

    const validatedData = checkoutSchema.parse(body);
    const order = await checkoutOrder(id, validatedData);
    return successResponse(transformOrder(order));
  } catch (error) {
    return handleError(error);
  }
}
