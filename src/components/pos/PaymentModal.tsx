"use client";

import { useState, useMemo } from "react";
import type { Order } from "@/types/pos";
import { formatCurrency } from "@/lib/utils";
import { X, QrCode, Percent, DollarSign } from "lucide-react";

interface PaymentModalProps {
  order: Order;
  onConfirm: (discountType?: "FIXED" | "PERCENT", discountValue?: number) => void;
  onClose: () => void;
}

// Generate mock QR code pattern
function generateQRPattern(): boolean[][] {
  const size = 21;
  const pattern: boolean[][] = [];
  
  for (let i = 0; i < size; i++) {
    const row: boolean[] = [];
    for (let j = 0; j < size; j++) {
      // Create finder patterns (top-left, top-right, bottom-left)
      const isFinderPattern = 
        (i < 7 && j < 7) || 
        (i < 7 && j >= size - 7) || 
        (i >= size - 7 && j < 7);
      
      if (isFinderPattern) {
        // Finder pattern logic
        const isEdge = i === 0 || i === 6 || j === 0 || j === 6 ||
                       (i < 7 && (j === size - 7 || j === size - 1)) ||
                       (i >= size - 7 && (j === 0 || j === 6));
        const isInner = (i >= 2 && i <= 4 && j >= 2 && j <= 4) ||
                        (i >= 2 && i <= 4 && j >= size - 5 && j <= size - 3) ||
                        (i >= size - 5 && i <= size - 3 && j >= 2 && j <= 4);
        row.push(isEdge || isInner);
      } else {
        // Random pattern for data area
        row.push(Math.random() > 0.5);
      }
    }
    pattern.push(row);
  }
  
  return pattern;
}

// Mock discount codes
// PERCENT: percentage value (10 = 10%)
// FIXED: value in satang (5000 = 50 baht)
const DISCOUNT_CODES: Record<string, { type: "FIXED" | "PERCENT"; value: number }> = {
  "SAVE10": { type: "PERCENT", value: 10 },
  "SAVE20": { type: "PERCENT", value: 20 },
  "FLAT50": { type: "FIXED", value: 5000 },   // 50 baht
  "FLAT100": { type: "FIXED", value: 10000 }, // 100 baht
};

export function PaymentModal({ order, onConfirm, onClose }: PaymentModalProps) {
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    type: "FIXED" | "PERCENT";
    value: number;
  } | null>(null);
  const [codeError, setCodeError] = useState("");
  
  // Generate QR pattern once
  const qrPattern = useMemo(() => generateQRPattern(), []);

  const handleApplyCode = () => {
    const code = discountCode.toUpperCase().trim();
    if (!code) {
      setCodeError("Please enter a discount code");
      return;
    }
    
    const discount = DISCOUNT_CODES[code];
    if (discount) {
      setAppliedDiscount(discount);
      setCodeError("");
    } else {
      setCodeError("Invalid discount code");
      setAppliedDiscount(null);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode("");
    setCodeError("");
  };

  // Calculate totals
  const discountAmount = appliedDiscount
    ? appliedDiscount.type === "FIXED"
      ? Math.min(appliedDiscount.value, order.subtotal)
      : (order.subtotal * appliedDiscount.value) / 100
    : 0;
  
  const grandTotal = Math.max(0, order.subtotal - discountAmount);

  const handleConfirm = () => {
    if (appliedDiscount) {
      onConfirm(appliedDiscount.type, appliedDiscount.value);
    } else {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-6">
          <h3 className="text-lg font-bold">Payment</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Discount Code Section */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Discount Code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={discountCode}
                onChange={(e) => {
                  setDiscountCode(e.target.value);
                  setCodeError("");
                }}
                placeholder="Enter code (e.g., SAVE10)"
                className="flex-1 rounded-lg border border-border bg-background px-4 py-2 uppercase"
                disabled={!!appliedDiscount}
              />
              {appliedDiscount ? (
                <button
                  onClick={handleRemoveDiscount}
                  className="rounded-lg border border-destructive px-4 py-2 text-destructive hover:bg-destructive/10"
                >
                  Remove
                </button>
              ) : (
                <button
                  onClick={handleApplyCode}
                  className="rounded-lg bg-accent px-4 py-2 font-medium hover:bg-accent/80"
                >
                  Apply
                </button>
              )}
            </div>
            {codeError && (
              <p className="mt-1 text-sm text-destructive">{codeError}</p>
            )}
            {appliedDiscount && (
              <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                {appliedDiscount.type === "PERCENT"
                  ? `${appliedDiscount.value}% discount applied!`
                  : `${formatCurrency(appliedDiscount.value)} discount applied!`}
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Try: SAVE10, SAVE20, FLAT50, FLAT100
            </p>
          </div>

          {/* QR Code Section */}
          <div className="flex flex-col items-center">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <QrCode className="h-4 w-4" />
              Scan to Pay
            </div>
            <div className="rounded-lg border-4 border-foreground bg-white p-3">
              <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(21, 8px)` }}>
                {qrPattern.map((row, i) =>
                  row.map((cell, j) => (
                    <div
                      key={`${i}-${j}`}
                      className={`h-2 w-2 ${cell ? "bg-black" : "bg-white"}`}
                    />
                  ))
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Mock QR Code - For demonstration only
            </p>
          </div>

          {/* Order Summary */}
          <div className="space-y-2 rounded-lg bg-muted p-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {appliedDiscount && (
              <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                <span className="flex items-center gap-1">
                  {appliedDiscount.type === "PERCENT" ? (
                    <Percent className="h-3 w-3" />
                  ) : (
                    <DollarSign className="h-3 w-3" />
                  )}
                  Discount ({appliedDiscount.type === "PERCENT" 
                    ? `${appliedDiscount.value}%` 
                    : formatCurrency(appliedDiscount.value)}):
                </span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-2 text-lg font-bold">
              <span>Total:</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-border py-3 font-medium hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 rounded-lg bg-green-600 py-3 font-medium text-white hover:bg-green-700"
            >
              Confirm Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
