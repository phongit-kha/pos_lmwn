import type { NextRequest } from "next/server";
import {
  successResponse,
  handleError,
  parseJsonBody,
  getRequestId,
} from "@/server/lib/api-response";
import { transformProductListItem, transformProduct } from "@/server/lib/transformers";
import { createProductSchema } from "@/server/validators";
import { parseProductFilters } from "@/server/validators/pagination.validator";
import {
  createProduct,
  listProducts,
} from "@/server/services/product.service";

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     description: Create a new menu item
 *     tags:
 *       - Products
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 description: Product name
 *               price:
 *                 type: integer
 *                 minimum: 1
 *                 description: Price per unit in satang (1 baht = 100 satang)
 *                 example: 8900
 *               category:
 *                 type: string
 *                 description: Product category
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 description: Whether the product is active
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation error
 */
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const body = await parseJsonBody(request);
    const validatedData = createProductSchema.parse(body);

    const product = await createProduct(validatedData);
    return successResponse(transformProduct(product), requestId, { status: 201 });
  } catch (error) {
    return handleError(error, requestId);
  }
}

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: List products
 *     description: Get a paginated list of products with optional filters
 *     tags:
 *       - Products
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by product name
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
 *         description: Paginated list of products
 */
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const { searchParams } = new URL(request.url);
    const filters = parseProductFilters(searchParams);

    const result = await listProducts(filters);
    
    return successResponse(
      result.data.map(transformProductListItem),
      requestId,
      { pagination: result.pagination }
    );
  } catch (error) {
    return handleError(error, requestId);
  }
}
