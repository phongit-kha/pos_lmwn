"use client";

import { formatCurrency } from "@/lib/utils";
import type { Order } from "@/types/pos";
import { Save, CreditCard, XCircle, Loader2 } from "lucide-react";

interface OrderSummaryProps {
  order: Order | null | undefined;
  pendingTotal: number;
  displaySubtotal: number;
  displayGrandTotal: number;
  hasPendingItems: boolean;
  canCheckout: boolean;
  isLoading: boolean;
  activeItemsCount: number;
  onConfirmOrder: () => void;
  onOpenPayment: () => void;
  onCancelOrder: () => void;
}

/**
 * Order summary component with totals and action buttons
 */
export function OrderSummary({
  order,
  pendingTotal,
  displaySubtotal,
  displayGrandTotal,
  hasPendingItems,
  canCheckout,
  isLoading,
  activeItemsCount,
  onConfirmOrder,
  onOpenPayment,
  onCancelOrder,
}: OrderSummaryProps) {
  const showConfirmButton =
    !order || order.status === "OPEN" || order.status === "CONFIRMED";
  const showCancelButton =
    order && (order.status === "OPEN" || order.status === "CONFIRMED");

  return (
    <div className="space-y-3 border-t bg-accent p-6">
      {/* Confirmed items subtotal */}
      {order && order.subtotal > 0 && (
        <div className="flex justify-between text-sm">
          <span>Confirmed Items:</span>
          <span>{formatCurrency(order.subtotal)}</span>
        </div>
      )}

      {/* Pending items subtotal */}
      {pendingTotal > 0 && (
        <div className="flex justify-between text-sm text-amber-600 dark:text-amber-400">
          <span>Pending Items:</span>
          <span>{formatCurrency(pendingTotal)}</span>
        </div>
      )}

      <div className="flex justify-between text-sm">
        <span>Subtotal:</span>
        <span>{formatCurrency(displaySubtotal)}</span>
      </div>

      {order?.discountType && order?.discountValue && (
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            Discount (
            {order.discountType === "PERCENT"
              ? `${order.discountValue}%`
              : formatCurrency(order.discountValue)}
            ):
          </span>
          <span>
            -
            {formatCurrency(
              order.discountType === "FIXED"
                ? order.discountValue
                : (order.subtotal * order.discountValue) / 100
            )}
          </span>
        </div>
      )}

      <div className="flex justify-between border-t pt-3 text-xl font-semibold">
        <span>Grand Total:</span>
        <span>{formatCurrency(displayGrandTotal)}</span>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-3">
        {/* Confirm Order button */}
        {showConfirmButton && (
          <button
            onClick={onConfirmOrder}
            disabled={isLoading || !hasPendingItems}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-foreground py-3 font-medium text-background hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            {order?.status === "CONFIRMED"
              ? "Confirm Additional Order"
              : "Confirm Order"}
          </button>
        )}

        {/* Checkout button */}
        {canCheckout && (
          <button
            onClick={onOpenPayment}
            disabled={isLoading || activeItemsCount === 0}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CreditCard className="h-5 w-5" />
            )}
            Checkout
          </button>
        )}

        {/* Cancel Order button */}
        {showCancelButton && (
          <button
            onClick={onCancelOrder}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-destructive py-3 font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <XCircle className="h-5 w-5" />
            Cancel Order
          </button>
        )}
      </div>
    </div>
  );
}
