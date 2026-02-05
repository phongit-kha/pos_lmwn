"use client";

import type { Product } from "@/types/pos";
import { formatCurrency } from "@/lib/utils";
import { Plus } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  return (
    <button
      onClick={() => onAdd(product)}
      className="w-full rounded-lg border bg-card p-4 transition-all hover:border-foreground hover:shadow-md"
    >
      <div className="flex flex-col space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 text-left">
            <div className="font-semibold">{product.name}</div>
            <div className="mt-1 text-lg font-semibold">
              {formatCurrency(product.price)}
            </div>
          </div>
          <Plus className="h-5 w-5 flex-shrink-0" />
        </div>
        <span className="self-start rounded-full bg-accent px-2 py-1 text-xs text-muted-foreground">
          {product.category}
        </span>
      </div>
    </button>
  );
}
