import type { NextRequest } from "next/server";
import {
  successResponse,
  handleError,
  parseJsonBody,
} from "@/server/lib/api-response";
import {
  createProductSchema,
  productListFilterSchema,
} from "@/server/validators";
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
 *                 type: number
 *                 minimum: 0.01
 *                 description: Price per unit
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
  try {
    const body = await parseJsonBody(request);
    const validatedData = createProductSchema.parse(body);

    const product = await createProduct(validatedData);
    return successResponse(
      {
        id: product.id,
        name: product.name,
        price: product.price.toString(),
        category: product.category,
        isActive: product.isActive,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      },
      201
    );
  } catch (error) {
    return handleError(error);
  }
}

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: List products
 *     description: Get a list of products with optional filters
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
 *     responses:
 *       200:
 *         description: List of products
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters = productListFilterSchema.parse({
      category: searchParams.get("category") ?? undefined,
      isActive: searchParams.get("isActive") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });

    const products = await listProducts(filters);
    return successResponse(
      products.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price.toString(),
        category: product.category,
        isActive: product.isActive,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    return handleError(error);
  }
}
