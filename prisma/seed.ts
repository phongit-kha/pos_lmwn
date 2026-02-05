import { PrismaClient, OrderStatus, OrderItemStatus } from "../generated/prisma";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

// ============================================
// Product Data - Thai Restaurant Menu
// ============================================

// Prices are stored in satang (1 baht = 100 satang)
// Example: 89 baht = 8900 satang
// Using BigInt for precise integer arithmetic
// Categories: "FOOD" and "DRINK" to match frontend filters
const PRODUCTS: { name: string; price: bigint; category: string }[] = [
  // Main Dishes (FOOD)
  { name: "Pad Thai", price: 8900n, category: "FOOD" },
  { name: "Green Curry with Rice", price: 9500n, category: "FOOD" },
  { name: "Red Curry with Rice", price: 9500n, category: "FOOD" },
  { name: "Massaman Curry", price: 10500n, category: "FOOD" },
  { name: "Basil Chicken Rice", price: 7500n, category: "FOOD" },
  { name: "Pineapple Fried Rice", price: 9900n, category: "FOOD" },
  { name: "Tom Yum Fried Rice", price: 8900n, category: "FOOD" },
  { name: "Crispy Pork Rice", price: 7900n, category: "FOOD" },
  { name: "Grilled Pork Neck Rice", price: 8900n, category: "FOOD" },
  { name: "Chicken Teriyaki Rice", price: 8500n, category: "FOOD" },

  // Noodles (FOOD)
  { name: "Boat Noodles", price: 5500n, category: "FOOD" },
  { name: "Tom Yum Noodles", price: 6500n, category: "FOOD" },
  { name: "Pad See Ew", price: 7500n, category: "FOOD" },
  { name: "Drunken Noodles", price: 7900n, category: "FOOD" },
  { name: "Rad Na", price: 8500n, category: "FOOD" },

  // Appetizers (FOOD)
  { name: "Spring Rolls (4 pcs)", price: 5900n, category: "FOOD" },
  { name: "Chicken Satay (4 pcs)", price: 7900n, category: "FOOD" },
  { name: "Fish Cakes (5 pcs)", price: 6900n, category: "FOOD" },
  { name: "Crispy Wonton", price: 5500n, category: "FOOD" },
  { name: "Fried Tofu", price: 4900n, category: "FOOD" },

  // Soups (FOOD)
  { name: "Tom Yum Goong", price: 12900n, category: "FOOD" },
  { name: "Tom Kha Gai", price: 9900n, category: "FOOD" },
  { name: "Clear Soup", price: 5900n, category: "FOOD" },
  { name: "Wonton Soup", price: 6500n, category: "FOOD" },

  // Desserts (FOOD)
  { name: "Mango Sticky Rice", price: 7900n, category: "FOOD" },
  { name: "Coconut Ice Cream", price: 4900n, category: "FOOD" },
  { name: "Banana Roti", price: 5500n, category: "FOOD" },
  { name: "Thai Tea Pudding", price: 4500n, category: "FOOD" },

  // Beverages (DRINK)
  { name: "Thai Iced Tea", price: 4500n, category: "DRINK" },
  { name: "Thai Iced Coffee", price: 4500n, category: "DRINK" },
  { name: "Fresh Coconut", price: 5500n, category: "DRINK" },
  { name: "Lemon Soda", price: 3500n, category: "DRINK" },
  { name: "Sparkling Water", price: 2500n, category: "DRINK" },
  { name: "Soft Drink", price: 2500n, category: "DRINK" },
  { name: "Orange Juice", price: 4500n, category: "DRINK" },
  { name: "Mango Smoothie", price: 5500n, category: "DRINK" },
  { name: "Iced Lemon Tea", price: 3500n, category: "DRINK" },
  { name: "Hot Coffee", price: 4000n, category: "DRINK" },
];

// ============================================
// Helper Functions
// ============================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)]!;
}

function pickRandomMultiple<T>(arr: T[], min: number, max: number): T[] {
  const count = randomInt(min, max);
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function calculateSubtotal(
  items: { pricePerUnit: bigint; quantity: number; status: OrderItemStatus }[]
): bigint {
  return items
    .filter((item) => item.status === OrderItemStatus.ACTIVE)
    .reduce((sum, item) => sum + item.pricePerUnit * BigInt(item.quantity), 0n);
}

function applyDiscount(
  subtotal: bigint,
  discountType: string | null,
  discountValue: bigint | null
): bigint {
  if (!discountType || !discountValue) return subtotal;

  if (discountType === "PERCENT") {
    // discountValue is whole percentage (e.g., 10 for 10%)
    const discount = (subtotal * discountValue) / 100n;
    return subtotal - discount > 0n ? subtotal - discount : 0n;
  } else if (discountType === "FIXED") {
    // discountValue is in satang
    return subtotal - discountValue > 0n ? subtotal - discountValue : 0n;
  }
  return subtotal;
}

// ============================================
// Seed Functions
// ============================================

async function seedProducts() {
  console.log("🌱 Seeding products...");

  const products = await Promise.all(
    PRODUCTS.map((product) =>
      prisma.product.create({
        data: {
          name: product.name,
          price: product.price,
          category: product.category,
          isActive: Math.random() > 0.05, // 95% chance of being active
        },
      })
    )
  );

  console.log(`   ✅ Created ${products.length} products`);
  return products;
}

interface ProductData {
  id: string;
  name: string;
  price: bigint;
  category: string;
}

async function seedOrders(products: ProductData[]) {
  console.log("🌱 Seeding orders...");

  const orderStatuses: OrderStatus[] = [
    OrderStatus.OPEN,
    OrderStatus.CONFIRMED,
    OrderStatus.PAID,
    OrderStatus.CANCELLED,
  ];

  // Weighted distribution: more PAID orders for realistic data
  const statusWeights = {
    [OrderStatus.OPEN]: 15,
    [OrderStatus.CONFIRMED]: 20,
    [OrderStatus.PAID]: 55,
    [OrderStatus.CANCELLED]: 10,
  };

  function getWeightedStatus(): OrderStatus {
    const total = Object.values(statusWeights).reduce((a, b) => a + b, 0);
    let random = randomInt(1, total);

    for (const [status, weight] of Object.entries(statusWeights)) {
      random -= weight;
      if (random <= 0) return status as OrderStatus;
    }
    return OrderStatus.PAID;
  }

  const orders = [];
  const numOrders = 50; // Generate 50 orders

  for (let i = 0; i < numOrders; i++) {
    const status = getWeightedStatus();
    const tableNumber = randomInt(1, 20); // 20 tables

    // Select random products for this order
    const selectedProducts = pickRandomMultiple(products, 1, 6);

    // Create order items data
    // Note: Voiding is only allowed in CONFIRMED state, so:
    // - OPEN orders: all items ACTIVE
    // - CONFIRMED/PAID orders: some items might be VOIDED (voided when in CONFIRMED state)
    // - CANCELLED orders: all items VOIDED
    const canHaveVoidedItems =
      status === OrderStatus.CONFIRMED || status === OrderStatus.PAID;

    const itemsData = selectedProducts.map((product) => {
      const shouldVoid =
        status === OrderStatus.CANCELLED
          ? true
          : canHaveVoidedItems && Math.random() > 0.9;

      return {
        productId: product.id,
        productName: product.name,
        pricePerUnit: product.price,
        quantity: randomInt(1, 3),
        batchSequence: randomInt(1, 2), // Some items might be added in a second batch
        status: shouldVoid ? OrderItemStatus.VOIDED : OrderItemStatus.ACTIVE,
        voidReason: shouldVoid
          ? status === OrderStatus.CANCELLED
            ? "Order cancelled"
            : pickRandom([
                "Customer changed mind",
                "Out of stock",
                "Wrong order",
              ])
          : null,
      };
    });

    // Calculate totals using BigInt
    const subtotal = calculateSubtotal(itemsData);

    // Apply discount to some paid orders
    let discountType: string | null = null;
    let discountValue: bigint | null = null;

    if (status === OrderStatus.PAID && Math.random() > 0.7) {
      discountType = Math.random() > 0.5 ? "PERCENT" : "FIXED";
      // PERCENT values are whole percentages (5, 10, 15, 20)
      // FIXED values are in satang (1000 = 10 baht, 2000 = 20 baht, etc.)
      discountValue =
        discountType === "PERCENT"
          ? BigInt(pickRandom([5, 10, 15, 20]))
          : BigInt(pickRandom([1000, 2000, 5000, 10000]));
    }

    const grandTotal = applyDiscount(subtotal, discountType, discountValue);

    // Random date within the last 30 days
    const createdAt = faker.date.recent({ days: 30 });

    const order = await prisma.order.create({
      data: {
        tableNumber,
        status,
        subtotal,
        discountType,
        discountValue,
        grandTotal: status === OrderStatus.CANCELLED ? 0n : grandTotal,
        createdAt,
        updatedAt: createdAt,
        items: {
          create: itemsData,
        },
      },
      include: {
        items: true,
      },
    });

    // Create order logs based on status
    const logs = [];

    // All orders have a CREATE log
    logs.push({
      orderId: order.id,
      action: "CREATE",
      details: { tableNumber, itemCount: itemsData.length },
      createdAt,
    });

    // Add additional logs based on status
    if (status !== OrderStatus.OPEN) {
      // CONFIRMED, PAID, or CANCELLED orders were confirmed first
      if (status !== OrderStatus.CANCELLED) {
        logs.push({
          orderId: order.id,
          action: "CONFIRM",
          details: { 
            activeItemCount: itemsData.filter(i => i.status === OrderItemStatus.ACTIVE).length,
            subtotal: subtotal.toString(), // Store as string for JSON compatibility
          },
          createdAt: new Date(createdAt.getTime() + 5 * 60 * 1000), // 5 minutes later
        });
      }

      // PAID orders went through checkout
      if (status === OrderStatus.PAID) {
        logs.push({
          orderId: order.id,
          action: "CHECKOUT",
          details: {
            subtotal: subtotal.toString(),
            discountType,
            discountValue: discountValue !== null ? discountValue.toString() : null,
            discountAmount: discountValue !== null 
              ? (discountType === "PERCENT" 
                  ? ((subtotal * discountValue) / 100n).toString()
                  : discountValue.toString())
              : "0",
            grandTotal: grandTotal.toString(),
          },
          createdAt: new Date(createdAt.getTime() + 30 * 60 * 1000), // 30 minutes later
        });
      }

      // CANCELLED orders have a CANCEL log
      if (status === OrderStatus.CANCELLED) {
        logs.push({
          orderId: order.id,
          action: "CANCEL",
          details: { 
            previousStatus: OrderStatus.OPEN,
            grandTotal: "0",
          },
          createdAt: new Date(createdAt.getTime() + 10 * 60 * 1000), // 10 minutes later
        });
      }
    }

    // Add voided item logs
    const voidedItems = order.items.filter(
      (item) =>
        item.status === OrderItemStatus.VOIDED &&
        status !== OrderStatus.CANCELLED
    );
    for (const item of voidedItems) {
      // Calculate remaining subtotal after void
      const remainingSubtotal = order.items
        .filter(i => i.id !== item.id && i.status === OrderItemStatus.ACTIVE)
        .reduce((sum, i) => sum + i.pricePerUnit * BigInt(i.quantity), 0n);
      
      logs.push({
        orderId: order.id,
        action: "VOID_ITEM",
        details: {
          itemId: item.id,
          productName: item.productName,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit.toString(),
          reason: item.voidReason,
          newSubtotal: remainingSubtotal.toString(),
        },
        createdAt: new Date(createdAt.getTime() + randomInt(1, 20) * 60 * 1000),
      });
    }

    await prisma.orderLog.createMany({ data: logs });

    orders.push(order);
  }

  console.log(`   ✅ Created ${orders.length} orders with items and logs`);

  // Summary
  const statusCounts = orders.reduce(
    (acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    },
    {} as Record<OrderStatus, number>
  );

  console.log("   📊 Order status distribution:");
  for (const [status, count] of Object.entries(statusCounts)) {
    console.log(`      - ${status}: ${count}`);
  }

  return orders;
}

// ============================================
// Main Seed Function
// ============================================

async function main() {
  console.log("🚀 Starting database seed...\n");

  // Clear existing data
  console.log("🗑️  Clearing existing data...");
  await prisma.orderLog.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  console.log("   ✅ Cleared all tables\n");

  // Seed data
  const products = await seedProducts();
  console.log("");
  await seedOrders(products);

  console.log("\n✨ Database seeding completed!");

  // Print summary
  const productCount = await prisma.product.count();
  const orderCount = await prisma.order.count();
  const orderItemCount = await prisma.orderItem.count();
  const orderLogCount = await prisma.orderLog.count();

  console.log("\n📈 Database Summary:");
  console.log(`   - Products: ${productCount}`);
  console.log(`   - Orders: ${orderCount}`);
  console.log(`   - Order Items: ${orderItemCount}`);
  console.log(`   - Order Logs: ${orderLogCount}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
