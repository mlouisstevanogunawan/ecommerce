import { money } from '@/lib/supabase/result';
import type { Product, ProductVariant } from '@/lib/types';

// One price formula for the whole app: place_order() charges a variant's price
// before its product's, and treats discounted_price = 0 as "not discounted"
// rather than "free". Any component that does its own arithmetic can display a
// subtotal the server will not charge, so every shown price comes from here.
export function unitPrice(item: { product: Product; variant?: ProductVariant | null }): number {
  return effectivePrice(item.variant, item.product);
}

export function effectivePrice(
  variant: ProductVariant | null | undefined,
  product: Product,
): number {
  if (variant) return money(variant.discounted_price) || money(variant.price);
  return money(product.discounted_price) || money(product.price);
}

export function cartSubtotal(
  items: { product: Product; variant?: ProductVariant | null; quantity: number }[],
): number {
  return Math.round(items.reduce((sum, item) => sum + unitPrice(item) * item.quantity, 0) * 100) / 100;
}
