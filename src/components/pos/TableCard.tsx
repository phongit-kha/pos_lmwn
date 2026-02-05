"use client";

import type { Order } from "@/types/pos";
import { ShoppingBag, Clock, CheckCircle, XCircle } from "lucide-react";

interface TableCardProps {
  tableNumber: number;
  order?: Order;
  onClick: () => void;
}

export function TableCard({ tableNumber, order, onClick }: TableCardProps) {
  const getStatusIcon = () => {
    if (!order)
      return <ShoppingBag className="h-6 w-6 text-green-600" />;

    switch (order.status) {
      case "OPEN":
        return <Clock className="h-6 w-6 text-blue-600" />;
      case "CONFIRMED":
        return <CheckCircle className="h-6 w-6 text-blue-600" />;
      case "PAID":
        return <CheckCircle className="h-6 w-6" />;
      case "CANCELLED":
        return <XCircle className="h-6 w-6" />;
    }
  };

  const getCardStyles = () => {
    if (!order) {
      // Available - Green
      return "border-green-300 bg-green-50 hover:bg-green-100";
    }
    // Occupied (OPEN or CONFIRMED) - Blue
    return "border-blue-300 bg-blue-50 hover:bg-blue-100 shadow-sm";
  };

  return (
    <button
      onClick={onClick}
      className={`w-full h-32 rounded-lg border p-6 transition-all hover:shadow-md ${getCardStyles()}`}
    >
      <div className="flex flex-col items-center space-y-3">
        {getStatusIcon()}
        <div className="text-center">
          <div className="text-lg font-semibold">Table {tableNumber}</div>
          {order && (
            <div className="mt-1 text-sm text-muted-foreground">
              Not Available
            </div>
          )}
          {!order && (
            <div className="mt-1 text-sm text-muted-foreground">Available</div>
          )}
        </div>
      </div>
    </button>
  );
}
