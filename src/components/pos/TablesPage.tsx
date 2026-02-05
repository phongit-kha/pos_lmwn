"use client";

import { useRouter } from "next/navigation";
import { useOrders } from "@/hooks/use-orders";
import { TableCard } from "./TableCard";
import { Store, Loader2, BarChart3 } from "lucide-react";
import Link from "next/link";

const TABLES = Array.from({ length: 20 }, (_, i) => i + 1);

export function TablesPage() {
  const router = useRouter();
  const { orders, isLoading } = useOrders();

  const getOrderForTable = (tableNumber: number) => {
    return orders.find(
      (order) =>
        order.tableNumber === tableNumber &&
        (order.status === "OPEN" || order.status === "CONFIRMED")
    );
  };

  // Count tables that are available (no active order)
  const availableTables = TABLES.filter(
    (tableNumber) => !getOrderForTable(tableNumber)
  ).length;

  const handleSelectTable = (tableNumber: number) => {
    router.push(`/order/${tableNumber}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto max-w-7xl p-6">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <Store className="h-8 w-8 text-foreground" />
              <h1 className="text-3xl font-bold">POS System</h1>
            </div>
            <p className="text-muted-foreground">
              Select a table to start or manage an order
            </p>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 font-medium text-background transition-colors hover:bg-foreground/90"
          >
            <BarChart3 className="h-5 w-5" />
            Dashboard
          </Link>
        </div>

        {/* Statistics */}
        <div className="mb-8 grid grid-cols-4 gap-4">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="text-sm text-muted-foreground">Total Tables</div>
            <div className="mt-1 text-2xl font-bold">{TABLES.length}</div>
          </div>
          <div className="rounded-lg border-l-4 border-l-foreground/40 bg-card p-6 shadow-sm">
            <div className="text-sm text-muted-foreground">Open Orders</div>
            <div className="mt-1 text-2xl font-bold">
              {orders.filter((o) => o.status === "OPEN").length}
            </div>
          </div>
          <div className="rounded-lg border-l-4 border-l-foreground/60 bg-card p-6 shadow-sm">
            <div className="text-sm text-muted-foreground">Confirmed Orders</div>
            <div className="mt-1 text-2xl font-bold">
              {orders.filter((o) => o.status === "CONFIRMED").length}
            </div>
          </div>
          <div className="rounded-lg border-l-4 border-l-green-500 bg-card p-6 shadow-sm">
            <div className="text-sm text-muted-foreground">Available Tables</div>
            <div className="mt-1 text-2xl font-bold text-green-600">
              {availableTables}
            </div>
          </div>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {TABLES.map((tableNumber) => (
            <TableCard
              key={tableNumber}
              tableNumber={tableNumber}
              order={getOrderForTable(tableNumber)}
              onClick={() => handleSelectTable(tableNumber)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
