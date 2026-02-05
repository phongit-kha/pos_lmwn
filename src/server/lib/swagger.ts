import { createSwaggerSpec } from "next-swagger-doc";

export const getApiDocs = () => {
  const spec = createSwaggerSpec({
    apiFolder: "src/app/api",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Restaurant POS System API",
        version: "1.0.0",
        description: `
# Restaurant POS System Backend API

A robust, financially accurate Point of Sale backend for restaurant operations.

## Features

- **Order Management**: Create, view, and manage orders
- **Order Lifecycle**: State machine with OPEN → CONFIRMED → PAID flow
- **Batch Ordering**: Add items to existing orders in batches
- **Frozen Prices**: Historical price preservation for financial accuracy
- **Void Items**: Soft delete with mandatory reason (audit trail)
- **Financial Calculations**: Precise calculations using decimal.js
- **Discounts**: Support for percentage and fixed discounts
- **Sales Reports**: Aggregate sales data by date range

## Order Lifecycle

1. **OPEN**: Initial state when order is created
2. **CONFIRMED**: Items sent to kitchen (items can be added/voided)
3. **PAID**: Transaction completed (no modifications allowed)
4. **CANCELLED**: Order cancelled (only from OPEN or CONFIRMED)

## Authentication

This API currently does not require authentication (for development purposes).
        `,
        contact: {
          name: "API Support",
        },
      },
      tags: [
        {
          name: "Products",
          description: "Product (menu item) management",
        },
        {
          name: "Orders",
          description: "Order creation and retrieval",
        },
        {
          name: "Order Actions",
          description: "Actions on existing orders (add items, confirm, void)",
        },
        {
          name: "Payment",
          description: "Checkout and payment operations",
        },
        {
          name: "Reports",
          description: "Sales and analytics reports",
        },
      ],
      servers: [
        {
          url: "http://localhost:3000",
          description: "Development server",
        },
      ],
      components: {
        schemas: {
          Error: {
            type: "object",
            properties: {
              success: {
                type: "boolean",
                example: false,
              },
              error: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                  },
                  code: {
                    type: "string",
                  },
                  details: {
                    type: "array",
                    items: {
                      type: "object",
                    },
                  },
                },
              },
            },
          },
          Product: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              price: { type: "string" },
              category: { type: "string" },
              isActive: { type: "boolean" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
          OrderItem: {
            type: "object",
            properties: {
              id: { type: "string" },
              productId: { type: "string" },
              productName: { type: "string" },
              pricePerUnit: { type: "string" },
              quantity: { type: "integer" },
              batchSequence: { type: "integer" },
              status: { type: "string", enum: ["ACTIVE", "VOIDED"] },
              voidReason: { type: "string", nullable: true },
              itemTotal: { type: "string" },
            },
          },
          Order: {
            type: "object",
            properties: {
              id: { type: "string" },
              tableNumber: { type: "integer" },
              status: {
                type: "string",
                enum: ["OPEN", "CONFIRMED", "PAID", "CANCELLED"],
              },
              subtotal: { type: "string" },
              discountType: {
                type: "string",
                enum: ["PERCENT", "FIXED"],
                nullable: true,
              },
              discountValue: { type: "string", nullable: true },
              grandTotal: { type: "string" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
              items: {
                type: "array",
                items: { $ref: "#/components/schemas/OrderItem" },
              },
            },
          },
          OrderListItem: {
            type: "object",
            properties: {
              id: { type: "string" },
              tableNumber: { type: "integer" },
              status: {
                type: "string",
                enum: ["OPEN", "CONFIRMED", "PAID", "CANCELLED"],
              },
              grandTotal: { type: "string" },
              itemCount: { type: "integer" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
          SalesReport: {
            type: "object",
            properties: {
              summary: {
                type: "object",
                properties: {
                  totalOrders: { type: "integer" },
                  totalSales: { type: "string" },
                  totalDiscount: { type: "string" },
                  netSales: { type: "string" },
                },
              },
              dailyBreakdown: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    date: { type: "string", format: "date" },
                    orderCount: { type: "integer" },
                    totalSales: { type: "string" },
                    totalDiscount: { type: "string" },
                    netSales: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  return spec;
};
