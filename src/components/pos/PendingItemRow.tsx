"use client";

import type { Product } from "@/types/pos";
import { formatCurrency } from "@/lib/utils";
import { Trash2, Plus, Minus } from "lucide-react";

interface PendingItem {
  product: Product;
  quantity: number;
}

interface PendingItemRowProps {
  item: PendingItem;
  onQuantityChange: (newQuantity: number) => void;
  onRemove: () => void;
}

export function PendingItemRow({
  item,
  onQuantityChange,
  onRemove,
}: PendingItemRowProps) {
  const itemTotal = item.product.price * item.quantity;

  return (
    <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
      <div className="flex-1">
        <div className="font-medium">{item.product.name}</div>
        <div className="text-sm text-muted-foreground">
          {formatCurrency(item.product.price)} each
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onQuantityChange(Math.max(1, item.quantity - 1))}
          className="rounded p-1 hover:bg-amber-200 dark:hover:bg-amber-900"
          disabled={item.quantity <= 1}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-8 text-center font-medium">{item.quantity}</span>
        <button
          onClick={() => onQuantityChange(item.quantity + 1)}
          className="rounded p-1 hover:bg-amber-200 dark:hover:bg-amber-900"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="w-24 text-right font-semibold">
        {formatCurrency(itemTotal)}
      </div>

      <button
        onClick={onRemove}
        className="rounded p-2 text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-5 w-5" />
      </button>
    </div>
  );
}
