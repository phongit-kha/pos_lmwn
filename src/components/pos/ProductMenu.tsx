"use client";

import type { Product } from "@/types/pos";
import { ProductCard } from "./ProductCard";
import { UtensilsCrossed, Coffee, CheckCircle, Loader2 } from "lucide-react";

type CategoryFilter = "ALL" | "FOOD" | "DRINK";

interface ProductMenuProps {
  products: Product[];
  activeCategory: CategoryFilter;
  isLoading: boolean;
  canAddItems: boolean;
  orderStatus?: string;
  onCategoryChange: (category: CategoryFilter) => void;
  onAddProduct: (product: Product) => void;
}

/**
 * Product menu component with category filter and product grid
 */
export function ProductMenu({
  products,
  activeCategory,
  isLoading,
  canAddItems,
  orderStatus,
  onCategoryChange,
  onAddProduct,
}: ProductMenuProps) {
  const filteredProducts = products.filter(
    (product) => activeCategory === "ALL" || product.category === activeCategory
  );

  return (
    <div className="flex w-1/2 flex-col bg-accent/50">
      {/* Category Filter */}
      <div className="border-b bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Menu</h2>
        <div className="flex gap-2">
          <CategoryButton
            category="ALL"
            label="All Items"
            isActive={activeCategory === "ALL"}
            onClick={() => onCategoryChange("ALL")}
          />
          <CategoryButton
            category="FOOD"
            label="Food"
            icon={<UtensilsCrossed className="h-4 w-4" />}
            isActive={activeCategory === "FOOD"}
            onClick={() => onCategoryChange("FOOD")}
          />
          <CategoryButton
            category="DRINK"
            label="Drinks"
            icon={<Coffee className="h-4 w-4" />}
            isActive={activeCategory === "DRINK"}
            onClick={() => onCategoryChange("DRINK")}
          />
        </div>
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : !canAddItems ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-muted-foreground">
              <CheckCircle className="mx-auto mb-4 h-16 w-16" />
              <p className="font-medium">Order {orderStatus}</p>
              <p className="mt-2 text-sm">Cannot add more items</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={onAddProduct}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Internal category button component
interface CategoryButtonProps {
  category: CategoryFilter;
  label: string;
  icon?: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

function CategoryButton({
  label,
  icon,
  isActive,
  onClick,
}: CategoryButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors ${
        isActive
          ? "bg-foreground text-background"
          : "bg-accent hover:bg-accent/80"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
