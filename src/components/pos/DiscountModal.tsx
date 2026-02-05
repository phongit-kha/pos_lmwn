"use client";

import { useState } from "react";
import type { Order } from "@/types/pos";
import { formatCurrency, toSatang, toBaht } from "@/lib/utils";
import { X, Percent, Banknote } from "lucide-react";

interface DiscountModalProps {
  order: Order;
  onApply: (type: "FIXED" | "PERCENT", value: number) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function DiscountModal({
  order,
  onApply,
  onRemove,
  onClose,
}: DiscountModalProps) {
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENT">(
    order.discountType ?? "PERCENT"
  );
  // For FIXED, display value is in baht (user-friendly), but stored in satang
  const [discountValue, setDiscountValue] = useState<string>(
    order.discountValue
      ? order.discountType === "FIXED"
        ? toBaht(order.discountValue).toString()
        : order.discountValue.toString()
      : ""
  );

  const handleApply = () => {
    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) {
      alert("กรุณากรอกค่าส่วนลดที่ถูกต้อง");
      return;
    }

    if (discountType === "PERCENT" && value > 100) {
      alert("ส่วนลดเปอร์เซ็นต์ต้องไม่เกิน 100%");
      return;
    }

    // For FIXED, convert baht input to satang
    const subtotalInBaht = toBaht(order.subtotal);
    if (discountType === "FIXED" && value > subtotalInBaht) {
      alert("ส่วนลดต้องไม่เกินยอดรวม");
      return;
    }

    // Send value: PERCENT stays as-is, FIXED converts to satang
    const finalValue = discountType === "FIXED" ? toSatang(value) : value;
    onApply(discountType, finalValue);
    onClose();
  };

  const calculateDiscountPreview = () => {
    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) return 0;

    if (discountType === "FIXED") {
      // Input is in baht, convert to satang for calculation
      const valueInSatang = toSatang(value);
      return Math.min(valueInSatang, order.subtotal);
    } else {
      // Percentage calculation
      return Math.round((order.subtotal * Math.min(value, 100)) / 100);
    }
  };

  const discountAmount = calculateDiscountPreview();
  const grandTotalPreview = Math.max(0, order.subtotal - discountAmount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-card shadow-xl">
        <div className="flex items-center justify-between border-b p-6">
          <h3 className="text-lg font-bold">Apply Discount</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Discount Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDiscountType("PERCENT")}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 p-4 ${
                  discountType === "PERCENT"
                    ? "border-foreground bg-accent"
                    : "border-border"
                }`}
              >
                <Percent className="h-5 w-5" />
                เปอร์เซ็นต์
              </button>
              <button
                onClick={() => setDiscountType("FIXED")}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 p-4 ${
                  discountType === "FIXED"
                    ? "border-foreground bg-accent"
                    : "border-border"
                }`}
              >
                <Banknote className="h-5 w-5" />
                จำนวนเงิน
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              ส่วนลด {discountType === "PERCENT" ? "(%)" : "(บาท)"}
            </label>
            <input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2"
              placeholder="กรอกจำนวน"
              step={discountType === "PERCENT" ? "1" : "0.01"}
              min="0"
            />
          </div>

          <div className="space-y-2 rounded-lg bg-muted p-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-destructive">
              <span>Discount:</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-lg font-bold">
              <span>Grand Total:</span>
              <span>{formatCurrency(grandTotalPreview)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            {order.discountType && (
              <button
                onClick={() => {
                  onRemove();
                  onClose();
                }}
                className="flex-1 rounded-lg border-2 border-destructive px-4 py-3 font-medium text-destructive hover:bg-destructive/10"
              >
                Remove Discount
              </button>
            )}
            <button
              onClick={handleApply}
              className="flex-1 rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-primary/90"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
