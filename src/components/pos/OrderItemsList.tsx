"use client";

import { useMemo } from "react";
import type { Product, OrderItem } from "@/types/pos";
import { OrderItemRow } from "./OrderItemRow";
import { PendingItemRow } from "./PendingItemRow";
import { UtensilsCrossed, Package, Clock } from "lucide-react";

// Interface for pending items (not yet submitted to server)
export interface PendingItem {
  product: Product;
  quantity: number;
}

interface OrderItemsListProps {
  orderItems?: OrderItem[];
  pendingItems: Map<string, PendingItem>;
  canModify: boolean;
  canVoid: boolean;
  onPendingQuantityChange: (productId: string, quantity: number) => void;
  onRemovePendingItem: (productId: string) => void;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onVoidItem: (itemId: string, itemName: string) => void;
}

/**
 * Order items list component displaying pending and confirmed items
 */
export function OrderItemsList({
  orderItems = [],
  pendingItems,
  canModify,
  canVoid,
  onPendingQuantityChange,
  onRemovePendingItem,
  onQuantityChange,
  onVoidItem,
}: OrderItemsListProps) {
  // Group items by batch sequence
  const itemsByBatch = useMemo(() => {
    const grouped = new Map<number, OrderItem[]>();
    const sortedItems = [...orderItems].sort(
      (a, b) => a.batchSequence - b.batchSequence
    );

    for (const item of sortedItems) {
      const batch = item.batchSequence;
      if (!grouped.has(batch)) {
        grouped.set(batch, []);
      }
      grouped.get(batch)!.push(item);
    }

    return grouped;
  }, [orderItems]);

  const isEmpty = orderItems.length === 0 && pendingItems.size === 0;

  if (isEmpty) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <UtensilsCrossed className="mx-auto mb-4 h-16 w-16" />
          <p>No items added yet</p>
          <p className="mt-2 text-sm">Select products to add to this order</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Pending Items Section */}
      {pendingItems.size > 0 && (
        <div>
          <div className="flex items-center gap-2 bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-400">
            <Clock className="h-4 w-4" />
            Pending Items
            <span className="text-xs">
              ({pendingItems.size} items - not yet confirmed)
            </span>
          </div>
          {Array.from(pendingItems.entries()).map(([productId, item]) => (
            <PendingItemRow
              key={productId}
              item={item}
              onQuantityChange={(qty: number) =>
                onPendingQuantityChange(productId, qty)
              }
              onRemove={() => onRemovePendingItem(productId)}
            />
          ))}
        </div>
      )}

      {/* Confirmed Items by Batch */}
      {Array.from(itemsByBatch.entries()).map(([batchNumber, items]) => (
        <div key={batchNumber}>
          {/* Batch Header */}
          <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground">
            <Package className="h-4 w-4" />
            Batch #{batchNumber}
            <span className="text-xs">
              ({items.filter((i) => i.status === "ACTIVE").length} items)
            </span>
          </div>
          {/* Batch Items */}
          {items.map((item) => (
            <OrderItemRow
              key={item.id}
              item={item}
              canModify={canModify}
              canVoid={canVoid}
              onQuantityChange={onQuantityChange}
              onVoid={(itemId) => {
                if (!canVoid) {
                  alert("Cannot void items. Please confirm order first.");
                  return;
                }
                onVoidItem(itemId, item.productName);
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
