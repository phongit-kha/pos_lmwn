"use client";

import type { OrderItem } from "@/types/pos";
import { formatCurrency } from "@/lib/utils";
import { Trash2, Plus, Minus } from "lucide-react";

interface OrderItemRowProps {
  item: OrderItem;
  canModify: boolean;
  canVoid: boolean;
  onQuantityChange: (itemId: string, newQuantity: number) => void;
  onVoid: (itemId: string) => void;
}

export function OrderItemRow({
  item,
  canModify,
  canVoid,
  onQuantityChange,
  onVoid,
}: OrderItemRowProps) {
  if (item.status === "VOIDED") {
    return (
      <div className="flex items-center gap-3 border-l-4 border-destructive bg-destructive/10 px-4 py-3 opacity-60">
        <div className="flex-1 line-through">
          <div className="font-medium text-destructive">
            {item.productName}
          </div>
          {item.voidReason && (
            <div className="mt-1 text-xs text-destructive">
              Void: {item.voidReason}
            </div>
          )}
        </div>
        <div className="text-sm text-destructive line-through">
          {item.quantity} × {formatCurrency(item.pricePerUnit)}
        </div>
        <div className="w-24 text-right font-semibold text-destructive line-through">
          {formatCurrency(item.itemTotal)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
      <div className="flex-1">
        <div className="font-medium">{item.productName}</div>
        <div className="text-sm text-muted-foreground">
          {formatCurrency(item.pricePerUnit)} each
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() =>
            onQuantityChange(item.id, Math.max(1, item.quantity - 1))
          }
          className="rounded p-1 hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={item.quantity <= 1 || !canModify}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-8 text-center font-medium">{item.quantity}</span>
        <button
          onClick={() => onQuantityChange(item.id, item.quantity + 1)}
          className="rounded p-1 hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!canModify}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="w-24 text-right font-semibold">
        {formatCurrency(item.itemTotal)}
      </div>

      {canVoid && (
        <button
          onClick={() => onVoid(item.id)}
          className="rounded p-2 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      )}
      {!canVoid && <div className="w-9" />}
    </div>
  );
}
