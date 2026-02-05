# Restaurant POS System

A Point of Sale system for restaurant operations built with Next.js, Prisma, and PostgreSQL.

---

## How to Run the System

### Requirements

- Node.js 18 or higher
- pnpm
- Docker (for PostgreSQL database)

### Step 1: Install Dependencies

```bash
pnpm install
```

### Step 2: Set Up Environment

```bash
cp .env.example .env
```

The default `.env` file works with Docker Compose:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pos_lmwn"
```

### Step 3: Start the Database

```bash
docker compose up -d
```

### Step 4: Run Database Migrations

```bash
pnpm db:generate
```

### Step 5: (Optional) Add Sample Data

```bash
pnpm db:seed
```

### Step 6: Start the Application

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`

### Running Tests

```bash
pnpm test
```

---

## Design Decisions and Reasoning

### How I Ensure Financial Accuracy

Since this system handles revenue and financial data, I designed it to prevent calculation errors:

**1. Integer Arithmetic for Money**

All money values are stored as **satang** (1 baht = 100 satang) using BigInt:

```
10000 satang = 100.00 baht
```

Why? Floating-point math causes rounding errors:

```javascript
// Floating point problem
0.1 + 0.2 = 0.30000000000000004

// Integer math - no problem
10 + 20 = 30  // (satang)
```

**2. Database Transactions with Row-Level Locking**

All financial operations use `SELECT FOR UPDATE` with Serializable isolation:

```typescript
await db.$transaction(
  async (tx) => {
    await tx.$queryRaw`SELECT * FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    // ... update order ...
  },
  { isolationLevel: "Serializable" },
);
```

This prevents race conditions like double-checkout.

**3. Frozen Prices in Order Items**

When a customer orders, the product price is copied into the order item. If prices change later, historical orders remain accurate.

**4. Discount Validation**

- Percentage discounts are capped at 50%
- Fixed discounts cannot exceed the subtotal
- Grand total floors at 0 (never negative)

---

### How I Enable Quick Root Cause Identification

When issues occur, the system helps identify problems quickly:

**1. Request ID Tracing**

Every API request gets a unique ID (`req_abc123`). This ID appears in:

- Response headers (`x-request-id`)
- Response body (`meta.requestId`)
- Server logs

When a user reports an error, we can trace the exact request through the system.

**2. Structured JSON Logging**

All logs are JSON-formatted with context:

```json
{
  "level": "INFO",
  "timestamp": "2024-01-15T10:30:00Z",
  "message": "Order checkout completed",
  "context": {
    "orderId": "abc123",
    "grandTotal": "15000",
    "requestId": "req_xyz789"
  }
}
```

**3. Audit Trail (OrderLog Table)**

Every order action is logged with details:

| Action    | Details Logged                               |
| --------- | -------------------------------------------- |
| CREATE    | Table number, initial items, subtotal        |
| ADD_ITEMS | Batch sequence, item count, new subtotal     |
| VOID_ITEM | Item ID, product name, reason, price lost    |
| CHECKOUT  | Subtotal, discount type/value, grand total   |
| CANCEL    | Previous status, grand total at cancellation |

**4. Standardized Error Responses**

All errors return a consistent format with machine-readable codes:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATE",
    "message": "Cannot checkout: order must be confirmed first"
  },
  "meta": { "requestId": "req_xyz789" }
}
```

Error codes: `VALIDATION_ERROR`, `NOT_FOUND`, `INVALID_STATE`, `CONFLICT`, `INTERNAL_ERROR`

---

### How I Support Long-Term Maintainability

**1. Clear Separation of Concerns**

```
src/server/
├── services/      # Business logic (order.service.ts, calculation.service.ts)
├── validators/    # Input validation with Zod schemas
├── lib/           # Utilities (errors, logging, db-lock, transformers)
└── types/         # TypeScript type definitions
```

Each layer has a single responsibility:

- **Validators** - Validate input, nothing else
- **Services** - Business logic, no HTTP concerns
- **API Routes** - HTTP handling, delegate to services

**2. Centralized Error Definitions**

All error messages are defined in one place (`errors.ts`):

```typescript
export const ErrorMessage = {
  ORDER: {
    CANNOT_CHECKOUT_EMPTY: "Cannot checkout an order with no items.",
    CANNOT_CANCEL_PAID: "Cannot cancel a paid order.",
  },
  DISCOUNT: {
    PERCENT_RANGE: "Percentage discount must be between 0 and 50.",
  },
};
```

This makes it easy to update messages and add translations later.

**3. Type Safety with TypeScript**

All data flows through typed interfaces. The compiler catches errors before runtime.

**4. State Machine Pattern**

Order status transitions are explicitly defined:

```typescript
const STATE_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  OPEN: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PAID", "CANCELLED"],
  PAID: [], // Terminal state
  CANCELLED: [], // Terminal state
};
```

Adding new states or transitions is straightforward.

**5. Unit Tests for Critical Paths**

Financial calculations have comprehensive tests:

```typescript
it("should not have floating point errors", () => {
  const result = calculateItemTotal(10n, 3); // 0.10 baht * 3
  expect(result).toBe(30n); // Exactly 0.30 baht
});
```

---

## Priority Decisions

### P0: Financial Accuracy (Highest Priority)

A POS system that calculates money wrong is useless. I focused on:

- Integer arithmetic for all money (satang as BigInt)
- Database transactions with row-level locking
- Audit logging for voids and discounts
- Frozen prices in order items

### P1: Order Flow

This is the core business logic:

- Create orders for tables
- Add items in batches (even after confirming)
- Void items with mandatory reason
- Apply discounts at checkout

### P2: Observability

When problems occur, we need to find them fast:

- Request ID on every API call
- Structured JSON logging
- Audit trail in database
- Standardized error codes

### P3: Reports

Restaurant owners need insights:

- Peak hours analysis
- Top selling products
- Void analysis
- Table performance

---

## Future Improvements

If this system were used in production, these are the technical improvements I would prioritize:

### 1. API Rate Limiting

**Problem:** No protection against request floods or abuse.

**Solution:**

- Implement token bucket or sliding window rate limiting
- Use Redis for distributed rate limit counters
- Different limits per endpoint (stricter on `/checkout`)
- Return `429 Too Many Requests` with `Retry-After` header

### 2. Database Partial Unique Index

**Problem:** Two active orders on the same table is only prevented by application code.

**Solution:**

```sql
CREATE UNIQUE INDEX "Order_table_active_unique"
ON "Order" ("tableNumber")
WHERE status IN ('OPEN', 'CONFIRMED');
```

This enforces the constraint at database level, preventing race conditions.

### 3. Connection Pooling and Query Optimization

**Problem:** Under high load, database connections can be exhausted.

**Solution:**

- Configure PgBouncer for connection pooling
- Add database query performance monitoring
- Implement query result caching for read-heavy endpoints (product list)
- Add database indexes based on slow query analysis

### 4. Distributed Tracing

**Problem:** Request ID tracing works for single service, but doesn't scale to microservices.

**Solution:**

- Implement OpenTelemetry for distributed tracing
- Add trace context propagation across service boundaries
- Integrate with observability platform (Jaeger, Datadog, etc.)

### 5. Idempotency Keys for Payment Operations

**Problem:** Network failures during checkout could cause duplicate payments if client retries.

**Solution:**

- Accept `Idempotency-Key` header on checkout endpoint
- Store idempotency keys with response in Redis (TTL 24h)
- Return cached response for duplicate requests

### 6. Database Read Replicas

**Problem:** Read operations (reports, order lists) compete with writes.

**Solution:**

- Set up PostgreSQL read replicas
- Route read-only queries to replicas
- Use Prisma's `$replica` client extension

### 7. Graceful Shutdown and Health Checks

**Problem:** Deployments can interrupt in-flight requests.

**Solution:**

- Implement `/health` and `/ready` endpoints
- Handle SIGTERM with graceful shutdown
- Drain connections before stopping
- Configure Kubernetes probes appropriately

### 8. Input Sanitization and Security Headers

**Problem:** Basic security hardening is missing.

**Solution:**

- Add Helmet.js for security headers (CSP, HSTS, etc.)
- Implement request body size limits
- Add SQL injection protection review (Prisma helps, but review raw queries)
- Set up CORS properly for production domains

---

## API Documentation

Interactive API documentation is available at:

```
http://localhost:3000/api-docs
```

### Main Endpoints

| Method | Endpoint                               | Description         |
| ------ | -------------------------------------- | ------------------- |
| GET    | `/api/products`                        | List all products   |
| POST   | `/api/orders`                          | Create new order    |
| GET    | `/api/orders`                          | List orders         |
| GET    | `/api/orders/{id}`                     | Get order details   |
| POST   | `/api/orders/{id}/items`               | Add items to order  |
| POST   | `/api/orders/{id}/confirm`             | Confirm order       |
| POST   | `/api/orders/{id}/checkout`            | Pay and close order |
| POST   | `/api/orders/{id}/cancel`              | Cancel order        |
| PATCH  | `/api/orders/{id}/items/{itemId}/void` | Void an item        |
| GET    | `/api/reports/sales`                   | Sales report        |
| GET    | `/api/reports/dashboard`               | Dashboard data      |

### Response Format

**Success:**

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**Error:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Table number must be between 1 and 999"
  },
  "meta": {
    "requestId": "req_xyz789",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

## Project Structure

```
src/
├── app/
│   ├── api/          # API routes
│   ├── dashboard/    # Dashboard page
│   └── order/        # Order screen
├── components/       # React components
├── hooks/            # React hooks
├── server/
│   ├── services/     # Business logic
│   ├── validators/   # Input validation (Zod)
│   └── lib/          # Utilities (errors, logging, etc.)
└── __tests__/        # Unit and integration tests
```

---

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Validation:** Zod
- **Testing:** Vitest
- **API Docs:** Swagger/OpenAPI
