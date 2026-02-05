"use client";

import { useState, useCallback, useEffect } from "react";
import * as api from "@/lib/api-client";
import type { Order } from "@/types/pos";

interface UseOrdersResult {
  orders: Order[];
  isLoading: boolean;
  error: api.ApiError | null;
  refetch: () => Promise<void>;
}

export function useOrders(params?: {
  tableNumber?: number;
  status?: string;
}): UseOrdersResult {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<api.ApiError | null>(null);

  // Memoize params to avoid unnecessary refetches
  const tableNumber = params?.tableNumber;
  const status = params?.status;

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getOrders({ tableNumber, status });
      setOrders(data);
    } catch (err) {
      setError(
        err instanceof api.ApiError ? err : new api.ApiError(500, "Unknown error")
      );
    } finally {
      setIsLoading(false);
    }
  }, [tableNumber, status]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { orders, isLoading, error, refetch };
}

interface UseOrderResult {
  order: Order | null;
  isLoading: boolean;
  error: api.ApiError | null;
  setOrder: (order: Order | null) => void;
  fetchByTable: (tableNumber: number) => Promise<Order | null>;
  create: (input: api.CreateOrderRequest) => Promise<Order | null>;
  addItems: (input: api.AddItemsRequest) => Promise<Order | null>;
  updateItemQuantity: (itemId: string, quantity: number) => Promise<Order | null>;
  voidItem: (itemId: string, input: api.VoidItemRequest) => Promise<Order | null>;
  confirm: (orderId?: string) => Promise<Order | null>;
  checkout: (input?: api.CheckoutRequest) => Promise<Order | null>;
  cancel: () => Promise<Order | null>;
  refetch: () => Promise<void>;
}

export function useOrder(initialOrder?: Order): UseOrderResult {
  const [order, setOrder] = useState<Order | null>(initialOrder ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<api.ApiError | null>(null);

  const withLoading = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | null> => {
      setIsLoading(true);
      setError(null);
      try {
        return await fn();
      } catch (err) {
        setError(
          err instanceof api.ApiError
            ? err
            : new api.ApiError(500, "Unknown error")
        );
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const fetchByTable = useCallback(
    async (tableNumber: number): Promise<Order | null> => {
      const orders = await withLoading(() =>
        api.getOrders({ tableNumber, status: "OPEN" })
      );
      if (orders && orders.length > 0) {
        const firstOrder = orders[0]!;
        setOrder(firstOrder);
        return firstOrder;
      }
      // Try CONFIRMED status
      const confirmedOrders = await withLoading(() =>
        api.getOrders({ tableNumber, status: "CONFIRMED" })
      );
      if (confirmedOrders && confirmedOrders.length > 0) {
        const firstOrder = confirmedOrders[0]!;
        setOrder(firstOrder);
        return firstOrder;
      }
      setOrder(null);
      return null;
    },
    [withLoading]
  );

  const create = useCallback(
    async (input: api.CreateOrderRequest) => {
      const newOrder = await withLoading(() => api.createOrder(input));
      if (newOrder) setOrder(newOrder);
      return newOrder;
    },
    [withLoading]
  );

  const addItems = useCallback(
    async (input: api.AddItemsRequest) => {
      if (!order) return null;
      const updated = await withLoading(() => api.addItems(order.id, input));
      if (updated) setOrder(updated);
      return updated;
    },
    [order, withLoading]
  );

  const updateItemQuantityFn = useCallback(
    async (itemId: string, quantity: number) => {
      if (!order) return null;
      const updated = await withLoading(() =>
        api.updateItemQuantity(order.id, itemId, quantity)
      );
      if (updated) setOrder(updated);
      return updated;
    },
    [order, withLoading]
  );

  const voidItemFn = useCallback(
    async (itemId: string, input: api.VoidItemRequest) => {
      if (!order) return null;
      const updated = await withLoading(() =>
        api.voidItem(order.id, itemId, input)
      );
      if (updated) setOrder(updated);
      return updated;
    },
    [order, withLoading]
  );

  const confirm = useCallback(async (orderId?: string) => {
    const id = orderId ?? order?.id;
    if (!id) return null;
    const updated = await withLoading(() => api.confirmOrder(id));
    if (updated) setOrder(updated);
    return updated;
  }, [order, withLoading]);

  const checkout = useCallback(
    async (input?: api.CheckoutRequest) => {
      if (!order) return null;
      const updated = await withLoading(() =>
        api.checkoutOrder(order.id, input)
      );
      if (updated) setOrder(updated);
      return updated;
    },
    [order, withLoading]
  );

  const cancel = useCallback(async () => {
    if (!order) return null;
    const updated = await withLoading(() => api.cancelOrder(order.id));
    if (updated) setOrder(updated);
    return updated;
  }, [order, withLoading]);

  const refetch = useCallback(async () => {
    if (!order) return;
    const updated = await withLoading(() => api.getOrderById(order.id));
    if (updated) setOrder(updated);
  }, [order, withLoading]);

  return {
    order,
    setOrder,
    isLoading,
    error,
    fetchByTable,
    create,
    addItems,
    updateItemQuantity: updateItemQuantityFn,
    voidItem: voidItemFn,
    confirm,
    checkout,
    cancel,
    refetch,
  };
}
