# Restaurant POS System

A robust, financially accurate Point of Sale backend for restaurant operations built with Next.js, Prisma, and PostgreSQL.

## Features

- **Order Management**: Create, view, and manage orders with complete lifecycle support
- **State Machine**: Strict order state transitions (OPEN → CONFIRMED → PAID/CANCELLED)
- **Batch Ordering**: Add items to existing orders in separate batches
- **Frozen Prices**: Historical price preservation for financial accuracy
- **Void Items**: Soft delete with mandatory reason (audit trail)
- **Financial Calculations**: Precise monetary calculations using `decimal.js`
- **Discounts**: Support for percentage and fixed amount discounts
- **Sales Reports**: Aggregate sales data by date range
- **API Documentation**: Interactive Swagger UI at `/api-docs`

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL 14+
- **ORM**: Prisma
- **Validation**: Zod
- **Math Library**: decimal.js
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

### 5. Start the Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

## API Documentation

Interactive API documentation is available at:

```
http://localhost:3000/api-docs
```

## API Endpoints

### Products

| Method | Endpoint        | Description                |
| ------ | --------------- | -------------------------- |
| POST   | `/api/products` | Create a new product       |
| GET    | `/api/products` | List products with filters |

### Orders

| Method | Endpoint           | Description              |
| ------ | ------------------ | ------------------------ |
| POST   | `/api/orders`      | Create a new order       |
| GET    | `/api/orders`      | List orders with filters |
| GET    | `/api/orders/{id}` | Get order details        |

### Order Actions

| Method | Endpoint                               | Description                     |
| ------ | -------------------------------------- | ------------------------------- |
| POST   | `/api/orders/{id}/items`               | Add items to order (batch)      |
| POST   | `/api/orders/{id}/confirm`             | Confirm order (send to kitchen) |
| PATCH  | `/api/orders/{id}/items/{itemId}/void` | Void an item                    |
| POST   | `/api/orders/{id}/checkout`            | Checkout with optional discount |

### Reports

| Method | Endpoint             | Description                |
| ------ | -------------------- | -------------------------- |
| GET    | `/api/reports/sales` | Sales report by date range |

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

- **OPEN**: Items can be freely added, modified, or removed
- **CONFIRMED**: Items can be added (new batch) or voided (with reason)
- **PAID**: No modifications allowed (terminal state)
- **CANCELLED**: No modifications allowed (terminal state)

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

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── orders/           # Order endpoints
│   │   ├── products/         # Product endpoints
│   │   ├── reports/          # Report endpoints
│   │   └── docs/             # OpenAPI spec endpoint
│   └── api-docs/             # Swagger UI page
├── server/
│   ├── services/             # Business logic
│   │   ├── calculation.service.ts
│   │   ├── order.service.ts
│   │   ├── product.service.ts
│   │   └── report.service.ts
│   ├── validators/           # Zod schemas
│   ├── types/                # TypeScript types
│   └── lib/                  # Utilities
└── __tests__/
    ├── unit/                 # Unit tests
    └── integration/          # Integration tests
```

## Financial Calculations

All monetary calculations use `decimal.js` to avoid floating-point errors:

- **Item Total** = `pricePerUnit × quantity`
- **Subtotal** = Sum of all ACTIVE item totals
- **Discount** = `subtotal × (percent/100)` or fixed amount
- **Grand Total** = `subtotal - discount` (floors at 0.00)

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
| `pnpm db:studio`     | Open Prisma Studio                      |

## License

MIT
