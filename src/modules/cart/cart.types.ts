// src/modules/cart/cart.types.ts

export interface CartItemStored {
  productId: string;
  size: string;
  color: string;
  quantity: number;
}

export interface EnrichedCartItem extends CartItemStored {
  variantKey: string;
  title: string;
  brand: string;
  imageUrl: string;
  unitPrice: number;
  totalPrice: number;
  availableStock: number;
  stockWarning?: string;
}

export interface CartResponse {
  items: EnrichedCartItem[];
  subtotal: number;
  totalItems: number;
  warnings: string[];
}