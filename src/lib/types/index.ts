export type UserRole = 'customer' | 'seller' | 'admin';
export type ProductStatus = 'draft' | 'pending' | 'published';
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  phone?: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at?: string;
  products_count?: number;
  sales_count?: number;
  rating?: number;
  reviews_count?: number;
}

export interface Category {
  id: string;
  parent_id?: string | null;
  name: string;
  slug: string;
  image_url?: string | null;
  icon?: string | null;
  sort_order: number;
  children?: Category[];
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku?: string | null;
  price: number;
  discounted_price: number;
  stock: number;
  attributes: Record<string, string>;
}

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  review_text: string;
  created_at: string;
  user?: {
    full_name: string;
    avatar_url?: string | null;
  };
}

export interface Product {
  id: string;
  store_id: string;
  category_id: string;
  title: string;
  slug: string;
  sku: string;
  description: string;
  details?: Record<string, string> | null;
  price: number;
  discount_rate: number;
  discounted_price: number;
  stock: number;
  is_digital: boolean;
  digital_file_path?: string | null;
  is_featured: boolean;
  is_special_offer: boolean;
  status: ProductStatus;
  views_count: number;
  created_at: string;
  updated_at: string;
  store?: Store;
  category?: Category;
  images?: ProductImage[];
  variants?: ProductVariant[];
  reviews?: ProductReview[];
  rating?: number;
  reviews_count?: number;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  product: Product;
  variant?: ProductVariant | null;
}

export interface Cart {
  id: string;
  user_id?: string | null;
  session_id?: string | null;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
}

export interface UserAddress {
  id: string;
  user_id: string;
  title: string;
  first_name: string;
  last_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string | null;
  country: string;
  state: string;
  city: string;
  postal_code: string;
  is_default: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  discount_percent?: number | null;
  discount_amount?: number | null;
  min_order_amount?: number;
  expires_at?: string | null;
  is_active: boolean;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string | null;
  variant_id?: string | null;
  product_title: string;
  product_image?: string | null;
  variant_name?: string | null;
  price: number;
  quantity: number;
  total_price: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id?: string | null;
  store_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: UserAddress;
  subtotal: number;
  discount: number;
  shipping_fee: number;
  total: number;
  coupon_code?: string | null;
  status: OrderStatus;
  payment_method: string;
  payment_status: PaymentStatus;
  notes?: string | null;
  currency?: string;
  exchange_rate?: number;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  store?: Store;
}

export interface BlogPost {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  image_url?: string | null;
  published: boolean;
  created_at: string;
  category?: {
    name: string;
    slug: string;
  };
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  post_count: number;
}

export type ContactMessageStatus = 'unread' | 'read';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: ContactMessageStatus;
  product_id: string | null;
  product?: { slug: string; title: string } | null;
  created_at: string;
}

export interface SiteSettings {
  id: string;
  site_title: string;
  site_description: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  currency_code: string;
  currency_symbol: string;
  facebook_url?: string | null;
  instagram_url?: string | null;
  twitter_url?: string | null;
  youtube_url?: string | null;
}

export type BannerPlacement = 'hero' | 'promo_two' | 'promo_three' | 'category_showcase';

export interface Banner {
  id: string;
  placement: BannerPlacement;
  category_id?: string | null;
  title: string;
  subtitle?: string | null;
  button_text?: string | null;
  link_url: string;
  image_url?: string | null;
  background_color?: string | null;
  sort_order: number;
  is_active: boolean;
}
