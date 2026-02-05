"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { Product } from "@/types/pos";
import { useProducts } from "@/hooks/use-products";
import { useOrder } from "@/hooks/use-orders";

// Sub-components
import { OrderHeader } from "./OrderHeader";
import { OrderItemsList, type PendingItem } from "./OrderItemsList";
import { OrderSummary } from "./OrderSummary";
import { ProductMenu } from "./ProductMenu";
import { VoidReasonModal } from "./VoidReasonModal";
import { PaymentModal } from "./PaymentModal";
import { Loader2 } from "lucide-react";

interface OrderScreenProps {
  tableNumber: number;
}

type CategoryFilter = "ALL" | "FOOD" | "DRINK";

/**
 * Main order screen component for managing table orders
 * Composed of smaller, focused sub-components for better maintainability
 */
export function OrderScreen({ tableNumber }: OrderScreenProps) {
  const router = useRouter();
  const { products, isLoading: productsLoading } = useProducts();
  const {
    order,
    isLoading: orderLoading,
    fetchByTable,
    create,
    addItems,
    updateItemQuantity,
    voidItem,
    confirm,
    checkout,
    cancel,
  } = useOrder();

  // UI State
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("ALL");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [voidingItem, setVoidingItem] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Pending items state - items added locally but not yet submitted
  const [pendingItems, setPendingItems] = useState<Map<string, PendingItem>>(
    new Map()
  );

  // Load existing order for this table
  useEffect(() => {
    void fetchByTable(tableNumber);
  }, [tableNumber, fetchByTable]);

  // ============================================
  // Derived State
  // ============================================

  const activeItemsCount =
    order?.items.filter((item) => item.status === "ACTIVE").length ?? 0;

  const hasPendingItems = pendingItems.size > 0;

  // Calculate pending items total
  const pendingTotal = useMemo(() => {
    let total = 0;
    for (const item of pendingItems.values()) {
      total += item.product.price * item.quantity;
    }
    return total;
  }, [pendingItems]);

  // Combined totals
  const displaySubtotal = (order?.subtotal ?? 0) + pendingTotal;
  const displayGrandTotal = (order?.grandTotal ?? 0) + pendingTotal;

  // Permission flags
  const canModify = !order || order.status === "OPEN";
  const canAddItemsFlag =
    !order || order.status === "OPEN" || order.status === "CONFIRMED";
  const canVoid = order?.status === "CONFIRMED";
  const canCheckout = order?.status === "CONFIRMED" && !hasPendingItems;

  const isLoading = productsLoading || orderLoading;

  // ============================================
  // Event Handlers
  // ============================================

  const handleBack = useCallback(() => {
    router.push("/");
  }, [router]);

  // Add product to pending items (local state only)
  const handleAddProduct = useCallback((product: Product) => {
    setPendingItems((prev) => {
      const updated = new Map(prev);
      const existing = updated.get(product.id);
      if (existing) {
        updated.set(product.id, {
          ...existing,
          quantity: existing.quantity + 1,
        });
      } else {
        updated.set(product.id, { product, quantity: 1 });
      }
      return updated;
    });
  }, []);

  // Update pending item quantity
  const handlePendingQuantityChange = useCallback(
    (productId: string, newQuantity: number) => {
      setPendingItems((prev) => {
        const updated = new Map(prev);
        if (newQuantity <= 0) {
          updated.delete(productId);
        } else {
          const existing = updated.get(productId);
          if (existing) {
            updated.set(productId, { ...existing, quantity: newQuantity });
          }
        }
        return updated;
      });
    },
    []
  );

  // Remove pending item
  const handleRemovePendingItem = useCallback((productId: string) => {
    setPendingItems((prev) => {
      const updated = new Map(prev);
      updated.delete(productId);
      return updated;
    });
  }, []);

  // Update confirmed item quantity
  const handleQuantityChange = useCallback(
    async (itemId: string, newQuantity: number) => {
      if (order?.status !== "OPEN") return;
      await updateItemQuantity(itemId, newQuantity);
    },
    [order?.status, updateItemQuantity]
  );

  // Handle void item with reason
  const handleVoidItem = useCallback(
    async (reason: string) => {
      if (!voidingItem || !order) return;
      const toastId = toast.loading("Voiding item...");
      try {
        await voidItem(voidingItem.id, { reason });
        toast.success(`${voidingItem.name} voided successfully`, {
          id: toastId,
        });
        setVoidingItem(null);
      } catch {
        toast.error("Failed to void item", { id: toastId });
      }
    },
    [voidingItem, order, voidItem]
  );

  // Open void modal for an item
  const handleOpenVoidModal = useCallback(
    (itemId: string, itemName: string) => {
      setVoidingItem({ id: itemId, name: itemName });
    },
    []
  );

  // Confirm order - submit pending items and transition state
  const handleConfirmOrder = useCallback(async () => {
    if (pendingItems.size === 0) {
      toast.error("No items to confirm");
      return;
    }

    const itemsArray = Array.from(pendingItems.values()).map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
    }));

    const toastId = toast.loading("Confirming order...");
    try {
      if (!order) {
        // Create new order with items and confirm
        const newOrder = await create({ tableNumber, items: itemsArray });
        if (newOrder) {
          await confirm(newOrder.id);
        }
      } else if (order.status === "OPEN") {
        // Add items to existing OPEN order then confirm
        await addItems({ items: itemsArray });
        await confirm(order.id);
      } else if (order.status === "CONFIRMED") {
        // Add items as new batch to CONFIRMED order
        await addItems({ items: itemsArray });
      }

      // Clear pending items after successful submission
      setPendingItems(new Map());
      toast.success(
        order?.status === "CONFIRMED"
          ? "Additional items confirmed!"
          : "Order confirmed successfully!",
        { id: toastId }
      );
    } catch {
      toast.error("Failed to confirm order", { id: toastId });
    }
  }, [pendingItems, order, tableNumber, create, confirm, addItems]);

  // Open payment modal
  const handleOpenPayment = useCallback(() => {
    if (order?.status !== "CONFIRMED") {
      toast.error("Please confirm the order first");
      return;
    }
    if (pendingItems.size > 0) {
      toast.error("Please confirm pending items first");
      return;
    }
    setShowPaymentModal(true);
  }, [order?.status, pendingItems.size]);

  // Process payment
  const handlePayOrder = useCallback(
    async (discountType?: "FIXED" | "PERCENT", discountValue?: number) => {
      if (!order) return;
      const toastId = toast.loading("Processing payment...");
      try {
        await checkout(
          discountType && discountValue !== undefined
            ? { discountType, discountValue }
            : undefined
        );
        toast.success("Payment successful!", { id: toastId });
        setShowPaymentModal(false);
        router.push("/");
      } catch {
        toast.error("Payment failed", { id: toastId });
      }
    },
    [order, checkout, router]
  );

  // Cancel order
  const handleCancelOrder = useCallback(async () => {
    if (window.confirm("Are you sure you want to cancel this order?")) {
      const toastId = toast.loading("Cancelling order...");
      try {
        if (order) {
          await cancel();
        }
        setPendingItems(new Map());
        toast.success("Order cancelled", { id: toastId });
        router.push("/");
      } catch {
        toast.error("Failed to cancel order", { id: toastId });
      }
    }
  }, [order, cancel, router]);

  // ============================================
  // Render
  // ============================================

  if (isLoading && !order) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Panel - Order Items */}
      <div className="flex w-1/2 flex-col border-r bg-card">
        <OrderHeader
          tableNumber={tableNumber}
          orderId={order?.id}
          status={order?.status ?? "NEW"}
          activeItemsCount={activeItemsCount}
          onBack={handleBack}
        />

        <div className="flex-1 overflow-y-auto">
          <OrderItemsList
            orderItems={order?.items}
            pendingItems={pendingItems}
            canModify={canModify}
            canVoid={canVoid ?? false}
            onPendingQuantityChange={handlePendingQuantityChange}
            onRemovePendingItem={handleRemovePendingItem}
            onQuantityChange={handleQuantityChange}
            onVoidItem={handleOpenVoidModal}
          />
        </div>

        <OrderSummary
          order={order}
          pendingTotal={pendingTotal}
          displaySubtotal={displaySubtotal}
          displayGrandTotal={displayGrandTotal}
          hasPendingItems={hasPendingItems}
          canCheckout={canCheckout}
          isLoading={orderLoading}
          activeItemsCount={activeItemsCount}
          onConfirmOrder={handleConfirmOrder}
          onOpenPayment={handleOpenPayment}
          onCancelOrder={handleCancelOrder}
        />
      </div>

      {/* Right Panel - Products */}
      <ProductMenu
        products={products}
        activeCategory={activeCategory}
        isLoading={productsLoading}
        canAddItems={canAddItemsFlag}
        orderStatus={order?.status}
        onCategoryChange={setActiveCategory}
        onAddProduct={handleAddProduct}
      />

      {/* Modals */}
      {showPaymentModal && order && (
        <PaymentModal
          order={order}
          onConfirm={handlePayOrder}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {voidingItem && (
        <VoidReasonModal
          itemName={voidingItem.name}
          onConfirm={handleVoidItem}
          onClose={() => setVoidingItem(null)}
        />
      )}
    </div>
  );
}
