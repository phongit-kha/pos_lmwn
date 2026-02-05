# Restaurant POS System

A robust, financially accurate Point of Sale system for restaurant operations built with Next.js, Prisma, and PostgreSQL.

## Features

- **Order Management**: Create, view, and manage orders with complete lifecycle support
- **State Machine**: Strict order state transitions (OPEN → CONFIRMED → PAID/CANCELLED)
- **Batch Ordering**: Add items to existing orders in separate batches
- **Frozen Prices**: Historical price preservation for financial accuracy
- **Void Items**: Soft delete with mandatory reason (audit trail)
- **Financial Calculations**: Precise monetary calculations using BigInt (satang)
- **Discounts**: Support for percentage and fixed amount discounts
- **Sales Reports**: SQL-aggregated analytics by date range
- **API Documentation**: Interactive Swagger UI at `/api-docs`

---

## Architecture Decisions

### Why PostgreSQL?

PostgreSQL was chosen over NoSQL for ACID compliance critical to financial transactions:

- **Atomicity**: Order state changes and payment processing must be all-or-nothing
- **Consistency**: Foreign key constraints ensure data integrity (OrderItem → Product)
- **Isolation**: Row-level locking (`SELECT FOR UPDATE`) prevents race conditions during concurrent checkouts
- **Durability**: Financial records must survive crashes

### Currency Handling

All monetary values stored as **satang (BigInt)** to avoid floating-point errors:

```
10000 satang = 100.00 baht
```

**Why BigInt over Decimal?**

- Integer arithmetic eliminates precision issues
- Direct compatibility with PostgreSQL `BIGINT`
- No floating-point surprises in calculations
- Display conversion happens only at API boundary

### API Response Contract

All API responses follow a strict contract:

**Success Response:**

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z",
    "pagination": { "page": 1, "limit": 20, "total": 100, ... }
  }
}
```

**Error Response:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Table number must be between 1 and 999",
    "field": "tableNumber"
  },
  "meta": {
    "requestId": "req_xyz789",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Concurrency Control

Race conditions are prevented using pessimistic locking:

```typescript
// All state-changing operations use this pattern
await withOrderLock(orderId, async (tx, order) => {
  // Check state INSIDE the lock
  if (order.status !== "CONFIRMED") {
    throw new InvalidStateError("...");
  }
  // Perform operation
});
```

---

## Development Priorities

This system was built with the following priorities:

### P0 - Financial Accuracy (Critical)

- All monetary values stored as satang (BigInt integers)
- Database transactions with row-level locking
- Audit logging for all financial actions (voids, discounts, payments)
- No floating-point arithmetic for money

### P1 - Order Flow (Core Business)

- Clear state machine: OPEN → CONFIRMED → PAID
- Batch ordering support for additional items
- Void with mandatory reason for audit trail
- Discount validation (max 50%, cannot exceed subtotal)

### P2 - Operational Insights (Staff Productivity)

- Peak hours analysis for staffing decisions
- Top products for inventory planning
- Table performance for layout optimization
- Void analysis for loss prevention

### P3 - Nice to Have (Deferred)

- Multi-currency support
- Staff performance tracking
- Loyalty program integration
- Kitchen display integration

---

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL 14+
- **ORM**: Prisma
- **Validation**: Zod
- **Testing**: Vitest
- **Documentation**: Swagger/OpenAPI

## Prerequisites

- Node.js 18+
- pnpm
- Docker & Docker Compose

## Quick Start

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd pos_lmwn
pnpm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

The default configuration works with the Docker Compose setup:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pos_lmwn"
```

### 3. Start PostgreSQL with Docker Compose

```bash
docker compose up -d
```

### 4. Run Database Migrations

```bash
pnpm db:generate
```

### 5. Seed Sample Data (Optional)

```bash
pnpm db:seed
```

### 6. Start the Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

---

## API Documentation

Interactive API documentation is available at:

```
http://localhost:3000/api-docs
```

## API Endpoints

### Products

| Method | Endpoint        | Description               |
| ------ | --------------- | ------------------------- |
| POST   | `/api/products` | Create a new product      |
| GET    | `/api/products` | List products (paginated) |

### Orders

| Method | Endpoint           | Description             |
| ------ | ------------------ | ----------------------- |
| POST   | `/api/orders`      | Create a new order      |
| GET    | `/api/orders`      | List orders (paginated) |
| GET    | `/api/orders/{id}` | Get full order details  |

### Order Actions

| Method | Endpoint                               | Description                     |
| ------ | -------------------------------------- | ------------------------------- |
| POST   | `/api/orders/{id}/items`               | Add items to order (batch)      |
| PUT    | `/api/orders/{id}/items/{itemId}`      | Update item quantity            |
| POST   | `/api/orders/{id}/confirm`             | Confirm order (send to kitchen) |
| PATCH  | `/api/orders/{id}/items/{itemId}/void` | Void an item                    |
| POST   | `/api/orders/{id}/checkout`            | Checkout with optional discount |
| POST   | `/api/orders/{id}/cancel`              | Cancel order                    |

### Reports

| Method | Endpoint             | Description                |
| ------ | -------------------- | -------------------------- |
| GET    | `/api/reports/sales` | Sales report by date range |

---

## Order Lifecycle

```
┌─────────┐     confirm()      ┌───────────┐     checkout()     ┌──────┐
│  OPEN   │ ─────────────────▶ │ CONFIRMED │ ─────────────────▶ │ PAID │
└─────────┘                    └───────────┘                    └──────┘
     │                              │
     │         cancel()             │         cancel()
     └──────────────┬───────────────┘
                    ▼
              ┌───────────┐
              │ CANCELLED │
              └───────────┘
```

### State Rules

| State     | Add Items | Modify Items | Void Items | Checkout | Cancel |
| --------- | --------- | ------------ | ---------- | -------- | ------ |
| OPEN      | ✅        | ✅           | ❌         | ❌       | ✅     |
| CONFIRMED | ✅        | ❌           | ✅         | ✅       | ✅     |
| PAID      | ❌        | ❌           | ❌         | ❌       | ❌     |
| CANCELLED | ❌        | ❌           | ❌         | ❌       | ❌     |

---

## Financial Calculations

All monetary calculations use BigInt (satang) for precision:

- **Item Total** = `pricePerUnit × quantity`
- **Subtotal** = Sum of all ACTIVE item totals
- **Discount** = `subtotal × (percent/100)` or fixed amount in satang
- **Grand Total** = `subtotal - discount` (floors at 0)

### Discount Rules

- **Percentage discount**: 0-50% (validated server-side)
- **Fixed discount**: Cannot exceed subtotal
- Both types stored in satang/percentage as integers

---

## Testing

Run all tests:

```bash
pnpm test
```

Run tests with coverage:

```bash
pnpm test:coverage
```

Run tests in watch mode:

```bash
pnpm test:watch
```

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── orders/           # Order endpoints
│   │   ├── products/         # Product endpoints
│   │   ├── reports/          # Report endpoints
│   │   └── docs/             # OpenAPI spec endpoint
│   ├── api-docs/             # Swagger UI page
│   ├── dashboard/            # Dashboard page
│   └── order/                # Order screen page
├── components/
│   ├── pos/                  # POS-specific components
│   └── ui/                   # Reusable UI components
├── hooks/                    # React hooks
├── lib/                      # Frontend utilities
├── server/
│   ├── services/             # Business logic
│   │   ├── calculation.service.ts
│   │   ├── order.service.ts
│   │   ├── product.service.ts
│   │   └── report.service.ts
│   ├── validators/           # Zod schemas
│   ├── types/                # TypeScript types
│   └── lib/
│       ├── api-response.ts   # Response helpers
│       ├── db-lock.ts        # Pessimistic locking
│       ├── errors.ts         # Centralized errors
│       ├── logger.ts         # Structured logging
│       └── transformers.ts   # DTO transformers
└── __tests__/
    ├── unit/                 # Unit tests
    └── integration/          # Integration tests
```

---

## Environment Variables

| Variable       | Description                  | Default       |
| -------------- | ---------------------------- | ------------- |
| `DATABASE_URL` | PostgreSQL connection string | (required)    |
| `NODE_ENV`     | Environment mode             | `development` |

## Scripts

| Command              | Description                             |
| -------------------- | --------------------------------------- |
| `pnpm dev`           | Start development server                |
| `pnpm build`         | Build for production                    |
| `pnpm start`         | Start production server                 |
| `pnpm test`          | Run tests                               |
| `pnpm test:coverage` | Run tests with coverage                 |
| `pnpm db:generate`   | Generate Prisma client & run migrations |
| `pnpm db:push`       | Push schema changes to database         |
| `pnpm db:seed`       | Seed database with sample data          |
| `pnpm db:studio`     | Open Prisma Studio                      |

---

## Error Codes

| Code               | Status | Description                    |
| ------------------ | ------ | ------------------------------ |
| `VALIDATION_ERROR` | 400    | Invalid input data             |
| `INVALID_JSON`     | 400    | Malformed JSON body            |
| `INVALID_STATE`    | 400    | Operation not allowed in state |
| `NOT_FOUND`        | 404    | Resource not found             |
| `CONFLICT`         | 409    | Resource conflict              |
| `INTERNAL_ERROR`   | 500    | Unexpected server error        |

---

## License

MIT
