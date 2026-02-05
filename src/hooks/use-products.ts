"use client";

import { useState, useEffect, useCallback } from "react";
import { getProducts, ApiError } from "@/lib/api-client";
import type { Product } from "@/types/pos";

interface UseProductsResult {
  products: Product[];
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

export function useProducts(category?: string): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getProducts(category);
      setProducts(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err : new ApiError(500, "Unknown error")
      );
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { products, isLoading, error, refetch };
}
