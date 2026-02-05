"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface VoidReasonModalProps {
  itemName: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

const VOID_REASONS = [
  "Customer changed mind",
  "Wrong item ordered",
  "Kitchen error",
  "Out of stock",
  "Quality issue",
  "Other",
];

export function VoidReasonModal({
  itemName,
  onConfirm,
  onClose,
}: VoidReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");

  const handleConfirm = () => {
    const reason = selectedReason === "Other" ? customReason : selectedReason;
    if (!reason.trim()) {
      alert("Please select or enter a void reason");
      return;
    }
    onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-card shadow-xl">
        <div className="flex items-center justify-between border-b p-6">
          <h3 className="text-lg font-bold">Void Item</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-lg bg-destructive/10 p-3">
            <p className="text-sm text-destructive">
              You are about to void:{" "}
              <span className="font-semibold">{itemName}</span>
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Select Reason
            </label>
            <div className="space-y-2">
              {VOID_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setSelectedReason(reason)}
                  className={`w-full rounded-lg border-2 p-3 text-left ${
                    selectedReason === reason
                      ? "border-foreground bg-accent"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          {selectedReason === "Other" && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                Specify Reason
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2"
                placeholder="Enter reason"
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border-2 border-border px-4 py-3 font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 rounded-lg bg-destructive px-4 py-3 font-medium text-destructive-foreground hover:bg-destructive/90"
            >
              Void Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
