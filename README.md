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

### Why PostgreSQL?

I chose PostgreSQL over NoSQL (like MongoDB) because this is a financial system. PostgreSQL provides:

- **ACID transactions** - When a customer pays, the order status change and payment must happen together or not at all
- **Foreign key constraints** - Prevents orphan records (e.g., order items pointing to deleted products)
- **Row-level locking** - Prevents two staff members from checking out the same order at the same time

### Why Store Money as Integers (Satang)?

All money values are stored as **satang** (1 baht = 100 satang) using BigInt instead of decimal or float.

```
10000 satang = 100.00 baht
```

**Why?** Floating-point math causes rounding errors:

```javascript
// Floating point problem
0.1 + 0.2 = 0.30000000000000004

// Integer math - no problem
10 + 20 = 30  // (satang)
```

In a POS system, even small errors add up over thousands of transactions.

### Why Freeze Prices in Order Items?

When a customer orders, I copy the product price into the order item. This way:

- If the product price changes tomorrow, old orders still show the correct historical price
- Financial reports remain accurate
- No need to track price history separately

### Why Use a State Machine for Orders?

Orders follow a strict flow:

```
OPEN → CONFIRMED → PAID
  ↓        ↓
  └── CANCELLED ──┘
```

This prevents invalid operations like:

- Paying for an order that hasn't been confirmed
- Modifying an order that's already paid
- Cancelling an order that's already paid

### Why Pessimistic Locking?

When two staff members try to checkout the same order at the same time, bad things can happen without proper locking. I use `SELECT FOR UPDATE` to lock the order row during checkout:

```typescript
await db.$queryRaw`SELECT * FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
```

This makes the second request wait until the first one finishes.

---

## Priority Decisions

### P0: Financial Accuracy (Highest Priority)

**Why?** A POS system that calculates money wrong is useless. I focused on:

- Storing all money as integers (satang)
- Using database transactions for all money operations
- Audit logging for voids and discounts
- Frozen prices in order items

### P1: Order Flow

**Why?** This is the core business logic. Staff need to:

- Create orders for tables
- Add items (even after sending to kitchen)
- Void items with a reason (for tracking)
- Apply discounts at checkout

### P2: Reports and Analytics

**Why?** Restaurant owners need insights to make decisions:

- **Peak hours** - Know when to schedule more staff
- **Top products** - Know what to keep in stock
- **Void analysis** - Track waste and potential theft
- **Table performance** - Optimize restaurant layout

### P3: Nice-to-Have (Not Implemented)

These features would be valuable but weren't critical for the MVP:

- Multi-currency support
- Staff login and permissions
- Kitchen display integration
- Loyalty programs

---

## Future Improvements

If this system were used in production, I would develop these next:

### 1. Staff Authentication and Permissions

**Why?** Currently, anyone can void items or apply discounts. In production, you need:

- Login system for staff
- Role-based permissions (cashier vs manager)
- Audit trail showing WHO did each action

### 2. Partial Unique Index for Table Orders

**Why?** The database should prevent two active orders on the same table. Currently this is only validated in code, but a database constraint would be safer:

```sql
CREATE UNIQUE INDEX ON "Order" ("tableNumber")
WHERE status IN ('OPEN', 'CONFIRMED');
```

### 3. Real-time Updates

**Why?** If two staff members are looking at the same order, they should see updates instantly. I would add:

- WebSocket connections
- Or polling with optimistic UI updates

### 4. Offline Support

**Why?** Internet goes down. A restaurant can't stop taking orders. I would add:

- Local storage for pending orders
- Sync when connection returns
- Conflict resolution

### 5. Receipt Printing

**Why?** Customers need receipts. I would integrate with thermal printers via:

- ESC/POS commands
- Or cloud printing services

### 6. Rate Limiting

**Why?** Protect the API from abuse. I would add:

- Request rate limits per IP
- Stricter limits on checkout endpoint

---

## API Documentation

Interactive API documentation is available at:

```
http://localhost:3000/api-docs
```

This provides a Swagger UI where you can:

- See all available endpoints
- View request/response schemas
- Test API calls directly

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

All API responses follow this format:

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
