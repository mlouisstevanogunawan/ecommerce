// Build-time drift guard: every field the domain types read must exist as a
// column in the generated schema (src/lib/supabase/database.ts). Renaming or
// dropping a column in a migration fails `tsc --noEmit` here instead of
// surfacing as a runtime "property is undefined" in the UI.
//
// It checks names, not types. Regenerate database.ts after every migration:
//   supabase gen types typescript --project-id <ref> --schema public > src/lib/supabase/database.ts

import type { Database } from './database';
import type {
  BlogPost,
  Cart,
  CartItem,
  Category,
  Coupon,
  Order,
  OrderItem,
  Product,
  ProductImage,
  ProductReview,
  ProductVariant,
  Profile,
  SiteSettings,
  Store,
  UserAddress,
} from '@/lib/types';

type Rows = Database['public']['Tables'];

/** Embedded relations and UI-only additions — deliberately not columns of their own table. */
type NotAColumn =
  | 'store'
  | 'category'
  | 'images'
  | 'variants'
  | 'reviews'
  | 'items'
  | 'product'
  | 'variant'
  | 'user'
  | 'children'
  | 'order';

type MissingColumns<T, R, Ignored extends string = never> =
  Exclude<keyof T, NotAColumn | Ignored> extends infer Key
    ? Key extends keyof R
      ? never
      : Key
    : never;

type Expect<N extends never> = N;

type _Profile = Expect<MissingColumns<Profile, Rows['profiles']['Row']>>;
type _Store = Expect<MissingColumns<Store, Rows['stores']['Row']>>;
type _Category = Expect<MissingColumns<Category, Rows['categories']['Row']>>;
type _Product = Expect<MissingColumns<Product, Rows['products']['Row']>>;
type _ProductImage = Expect<MissingColumns<ProductImage, Rows['product_images']['Row']>>;
type _ProductVariant = Expect<MissingColumns<ProductVariant, Rows['product_variants']['Row']>>;
type _ProductReview = Expect<MissingColumns<ProductReview, Rows['product_reviews']['Row']>>;
type _CartItem = Expect<MissingColumns<CartItem, Rows['cart_items']['Row']>>;
// Cart totals are computed from the priced lines by the query layer, not stored.
type _Cart = Expect<MissingColumns<Cart, Rows['carts']['Row'], 'subtotal' | 'discount' | 'total'>>;
type _UserAddress = Expect<MissingColumns<UserAddress, Rows['user_addresses']['Row']>>;
type _Coupon = Expect<MissingColumns<Coupon, Rows['coupons']['Row']>>;
type _Order = Expect<MissingColumns<Order, Rows['orders']['Row']>>;
type _OrderItem = Expect<MissingColumns<OrderItem, Rows['order_items']['Row']>>;
type _BlogPost = Expect<MissingColumns<BlogPost, Rows['blog_posts']['Row']>>;
type _SiteSettings = Expect<MissingColumns<SiteSettings, Rows['site_settings']['Row']>>;
