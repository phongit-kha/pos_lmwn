"use client";

import { ArrowLeft } from "lucide-react";
import type { OrderStatus } from "@/types/pos";

interface OrderHeaderProps {
  tableNumber: number;
  orderId?: string;
  status?: OrderStatus | "NEW";
  activeItemsCount: number;
  onBack: () => void;
}

/**
 * Order header component displaying table info and order status
 */
export function OrderHeader({
  tableNumber,
  orderId,
  status,
  activeItemsCount,
  onBack,
}: OrderHeaderProps) {
  return (
    <div className="border-b p-6">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to Tables
      </button>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Table {tableNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {orderId ? (
              <>
                Order #{orderId.slice(0, 8)} • {activeItemsCount} active items
              </>
            ) : (
              "New Order"
            )}
          </p>
        </div>
        <div className="rounded-lg bg-accent px-4 py-2 font-medium">
          {status ?? "NEW"}
        </div>
      </div>
    </div>
  );
}
