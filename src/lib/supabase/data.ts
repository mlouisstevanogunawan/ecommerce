import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireProfile, requireRole } from '@/lib/auth/session';
import { HttpError } from '@/lib/errors';
import { money, moneyList, unwrap } from '@/lib/supabase/result';
import { cartSubtotal } from '@/lib/pricing';
import { slugify } from '@/lib/utils';
import type {
  Banner,
  BannerPlacement,
  BlogCategory,
  BlogPost,
  Cart,
  CartItem,
  Category,
  ContactMessage,
  ContactMessageStatus,
  Order,
  OrderItem,
  Product,
  ProductReview,
  ProductVariant,
  Profile,
  SiteSettings,
  Store,
  UserAddress,
  UserRole,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// This module is the only place that talks to the database from the server.
// Every read and write checks { error } and throws. Nothing here may fall back
// to seed data or in-memory state: a fake product list or a fake "order placed"
// is worse than an error screen, because it hides a broken database.
// ---------------------------------------------------------------------------

const PRODUCT_MONEY = ['price', 'discounted_price', 'rating'] as const;
const STORE_MONEY = ['rating', 'total_revenue'] as const;
const ORDER_MONEY = ['subtotal', 'discount', 'shipping_fee', 'total', 'exchange_rate'] as const;
const ORDER_ITEM_MONEY = ['price', 'total_price'] as const;

// Review authors come from the profile_public view. PostgREST cannot embed a
// view (it has no declared foreign key), so authors are attached in a second
// query instead of leaking through profiles' own-row RLS.
const PRODUCT_SELECT = `
  *,
  store:stores(*),
  category:categories(*),
  images:product_images(*),
  variants:product_variants(*)
`;

const CART_ITEM_SELECT = `
  id,
  cart_id,
  product_id,
  variant_id,
  quantity,
  product:products(${PRODUCT_SELECT}),
  variant:product_variants(*)
`;

function mapProduct(row: Record<string, any> | null | undefined): Product | null {
  if (!row) return null;

  const store = row.store ? (moneyList([row.store], STORE_MONEY)[0] as unknown as Store) : undefined;
  const variants = moneyList(row.variants ?? [], PRODUCT_MONEY) as unknown as ProductVariant[];

  const [mapped] = moneyList([{ ...row, store, variants }], PRODUCT_MONEY);
  const product = mapped as unknown as Product;
  if (product.images?.length) {
    product.images = [...product.images].sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
    );
  }
  return product;
}

function mapCartRow(row: Record<string, any>): CartItem | null {
  const product = mapProduct(row.product);
  if (!product) return null; // product was deleted or unpublished since it was added
  return {
    id: row.id,
    cart_id: row.cart_id,
    product_id: row.product_id,
    variant_id: row.variant_id ?? null,
    quantity: Number(row.quantity),
    product,
    variant: row.variant ? (moneyList([row.variant], PRODUCT_MONEY)[0] as unknown as ProductVariant) : null,
  };
}

// PostgREST LIKE patterns are built from user text; these characters are either
// wildcards or the separator used inside or=() filter strings.
function likePattern(search: string): string {
  return `%${search.replace(/[%_'"(),]/g, ' ').trim()}%`;
}

// CATALOGUE ------------------------------------------------------------------

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase.from('categories').select('*').order('sort_order', { ascending: true }),
    'Load categories',
  );
  const all = (rows ?? []) as Category[];
  return all.filter((c) => !c.parent_id).map((p) => ({ ...p, children: all.filter((c) => c.parent_id === p.id) }));
}

async function categoryIdsForSlug(slug: string): Promise<string[]> {
  const supabase = await createClient();
  const parents = unwrap(
    await supabase.from('categories').select('id').eq('slug', slug),
    'Load category',
  );
  if (!parents || parents.length === 0) return [];

  const id = parents[0].id as string;
  const children = unwrap(
    await supabase.from('categories').select('id').eq('parent_id', id),
    'Load subcategories',
  );
  return [id, ...(children ?? []).map((c) => c.id as string)];
}

export interface ProductQuery {
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  limit?: number;
  featured?: boolean;
  specialOffer?: boolean;
  storeId?: string;
}

export async function getProducts(params: ProductQuery = {}): Promise<Product[]> {
  const supabase = await createClient();

  let query = supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('status', 'published');

  if (params.search) {
    const pattern = likePattern(params.search);
    query = query.or(`title.ilike.${pattern},description.ilike.${pattern}`);
  }
  if (params.category) {
    const ids = await categoryIdsForSlug(params.category);
    query = ids.length ? query.in('category_id', ids) : query.eq('category_id', '00000000-0000-0000-0000-000000000000');
  }
  if (params.brand) {
    query = query.filter('details->>Brand', 'eq', params.brand);
  }
  // ?sort=discount is linked from Special Offers and the mega menu, so it has
  // to narrow the list to discounted items, not simply reorder everything.
  if (params.sort === 'discount') query = query.gt('discount_rate', 0);
  if (params.minPrice !== undefined) query = query.gte('discounted_price', params.minPrice);
  if (params.maxPrice !== undefined) query = query.lte('discounted_price', params.maxPrice);
  if (params.featured) query = query.eq('is_featured', true);
  if (params.specialOffer) query = query.eq('is_special_offer', true);
  if (params.storeId) query = query.eq('store_id', params.storeId);

  if (params.sort === 'lowest_price') query = query.order('discounted_price', { ascending: true });
  else if (params.sort === 'highest_price') query = query.order('discounted_price', { ascending: false });
  else if (params.sort === 'highest_rating') query = query.order('rating', { ascending: false });
  else if (params.sort === 'name_asc') query = query.order('title', { ascending: true });
  else if (params.sort === 'popular') query = query.order('views_count', { ascending: false });
  else if (params.sort === 'discount') query = query.order('discount_rate', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  if (params.limit) query = query.limit(params.limit);

  const rows = unwrap(await query, 'Load products');
  return (rows ?? []).map(mapProduct).filter((p): p is Product => p !== null);
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  return getProducts({ featured: true, limit });
}

export async function getSpecialOffers(limit = 8): Promise<Product[]> {
  return getProducts({ specialOffer: true, limit });
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createClient();
  const row = unwrap(
    await supabase.from('products').select(PRODUCT_SELECT).eq('slug', slug).maybeSingle(),
    'Load product',
  );
  const product = mapProduct(row);
  if (!product) return null;
  return { ...product, reviews: await getReviews(product.id) };
}

export async function getReviews(productId: string): Promise<ProductReview[]> {
  const supabase = await createClient();

  const rows = unwrap(
    await supabase
      .from('product_reviews')
      .select('id, product_id, user_id, rating, review_text, created_at')
      .eq('product_id', productId)
      .order('created_at', { ascending: false }),
    'Load reviews',
  );
  if (!rows || rows.length === 0) return [];

  const authors = unwrap(
    await supabase
      .from('profile_public')
      .select('id, full_name, avatar_url')
      .in('id', [...new Set(rows.map((r) => r.user_id as string))]),
    'Load review authors',
  );

  const byId = new Map((authors ?? []).map((a) => [a.id as string, a]));
  return rows.map((row) => ({
    ...row,
    user: byId.get(row.user_id as string) ?? { full_name: 'Member', avatar_url: null },
  })) as unknown as ProductReview[];
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('status', 'published')
      .eq('category_id', product.category_id)
      .neq('id', product.id)
      .limit(limit),
    'Load related products',
  );
  return (rows ?? []).map(mapProduct).filter((p): p is Product => p !== null);
}

// The brand list used to be a hardcoded array in the filter sidebar, so it
// advertised brands the catalogue did not carry. This reads the distinct values
// actually stored in products.details->>'Brand'.
export async function getProductBrands(): Promise<string[]> {
  const supabase = await createClient();
  const rows = unwrap(await supabase.rpc('product_brands'), 'Load brands');
  return (rows ?? [])
    .map((row: { brand: string }) => row.brand)
    .filter((brand: string) => brand.length > 0);
}

// STORES ---------------------------------------------------------------------

export async function getShops(q?: string): Promise<Store[]> {
  const supabase = await createClient();
  let query = supabase.from('stores').select('*');
  if (q) query = query.ilike('title', likePattern(q));
  const rows = unwrap(await query.order('title'), 'Load stores');
  return moneyList(rows ?? [], STORE_MONEY) as unknown as Store[];
}

export async function getShopBySlug(slug: string): Promise<{ store: Store; products: Product[] } | null> {
  const supabase = await createClient();
  const row = unwrap(await supabase.from('stores').select('*').eq('slug', slug).maybeSingle(), 'Load store');
  if (!row) return null;

  const store = moneyList([row], STORE_MONEY)[0] as unknown as Store;
  return { store, products: await getProducts({ storeId: store.id }) };
}

// The Follow button used to fake a follower count out of local state. Both
// numbers come from the database: the count is a public aggregate, the flag is
// the caller's own row.
export async function getStoreFollowInfo(storeId: string): Promise<{ followers: number; isFollowing: boolean }> {
  const supabase = await createClient();
  const followers = unwrap(await supabase.rpc('store_follower_count', { p_store_id: storeId }), 'Load follower count');
  const isFollowing = unwrap(await supabase.rpc('is_following_store', { p_store_id: storeId }), 'Load follow state');
  return { followers: Number(followers ?? 0), isFollowing: Boolean(isFollowing) };
}

export async function toggleFollowStore(storeId: string): Promise<{ followers: number; isFollowing: boolean }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const existing = unwrap(
    await supabase.from('store_follows').select('id').eq('store_id', storeId).eq('user_id', profile.id).maybeSingle(),
    'Load follow',
  );

  if (existing) {
    const { error } = await supabase
      .from('store_follows')
      .delete()
      .eq('id', existing.id)
      .eq('user_id', profile.id);
    unwrap({ data: null, error }, 'Unfollow store');
  } else {
    const { error } = await supabase
      .from('store_follows')
      .insert({ store_id: storeId, user_id: profile.id });
    unwrap({ data: null, error }, 'Follow store');
  }

  return getStoreFollowInfo(storeId);
}

export async function getMyStore(): Promise<Store | null> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const row = unwrap(await supabase.from('stores').select('*').eq('user_id', profile.id).maybeSingle(), 'Load my store');
  return row ? (moneyList([row], STORE_MONEY)[0] as unknown as Store) : null;
}

export async function getMyStoreIds(): Promise<string[]> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const rows = unwrap(await supabase.from('stores').select('id').eq('user_id', profile.id), 'Load my stores');
  return (rows ?? []).map((r) => r.id as string);
}

// A self-registered seller has no stores row until they open their shop here.
// RLS (stores_insert_self) pins user_id to auth.uid(), so this can only ever
// create a shop owned by the caller.
export interface StoreInput {
  title: string;
  slug?: string | null;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
}

function storeFields(input: StoreInput, ownerId?: string) {
  const base = slugify(input.slug || input.title);
  if (!base) throw new HttpError(400, 'Store name must contain letters or numbers');
  return {
    title: input.title.trim(),
    // stores.slug is UNIQUE across the platform, so a generated slug is tied to
    // the owner; an explicitly chosen one is kept as-is and can collide, which
    // the database then reports as an error rather than silently renaming it.
    slug: input.slug || !ownerId ? base : `${base}-${ownerId.slice(0, 8)}`,
    description: input.description?.trim() || null,
    phone: input.phone?.trim() || null,
    address: input.address?.trim() || null,
    logo_url: input.logo_url?.trim() || null,
    cover_url: input.cover_url?.trim() || null,
  };
}

export async function createMyStore(input: StoreInput): Promise<Store> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const row = unwrap(
    await supabase
      .from('stores')
      .insert({ ...storeFields(input, profile.id), user_id: profile.id })
      .select('*')
      .single(),
    'Create store',
  );

  return moneyList([row], STORE_MONEY)[0] as unknown as Store;
}

// Seller "Store Settings": creates the shop on first save, updates it after.
// is_verified and the aggregate counters are excluded by the column grants in
// 006, so this path cannot promote its own shop.
export async function saveMyStore(input: StoreInput): Promise<Store> {
  const existing = await getMyStore();
  if (!existing) return createMyStore(input);

  const profile = await requireProfile();
  const supabase = await createClient();
  const row = unwrap(
    await supabase
      .from('stores')
      .update(storeFields(input))
      .eq('id', existing.id)
      .eq('user_id', profile.id)
      .select('*')
      .single(),
    'Update store',
  );

  return moneyList([row], STORE_MONEY)[0] as unknown as Store;
}

// BLOG -----------------------------------------------------------------------

export async function getBlogPosts(): Promise<BlogPost[]> {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from('blog_posts')
      .select('*, category:blog_categories(name, slug)')
      .eq('published', true)
      .order('created_at', { ascending: false }),
    'Load blog posts',
  );
  return (rows ?? []) as unknown as BlogPost[];
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const supabase = await createClient();
  const row = unwrap(
    await supabase
      .from('blog_posts')
      .select('*, category:blog_categories(name, slug)')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle(),
    'Load blog post',
  );
  return (row as unknown as BlogPost) ?? null;
}

// ADMIN BLOG CMS -------------------------------------------------------------
// Writes are admin-only in the database (blog_posts_*_admin policies), so an
// authenticated non-admin cannot change content even through the REST endpoint.

export interface BlogPostInput {
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  image_url?: string | null;
  published: boolean;
  category_id: string;
}

function blogPostValues(input: BlogPostInput) {
  return {
    title: input.title.trim(),
    slug: input.slug.trim(),
    content: input.content,
    excerpt: input.excerpt?.trim() || null,
    image_url: input.image_url?.trim() || null,
    published: input.published,
    category_id: input.category_id,
  };
}

export async function getAdminBlogPosts(): Promise<BlogPost[]> {
  await requireRole(['admin']);
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from('blog_posts')
      .select('*, category:blog_categories(name, slug)')
      .order('created_at', { ascending: false }),
    'Load blog posts',
  );
  return (rows ?? []) as unknown as BlogPost[];
}

export async function saveBlogPost(input: BlogPostInput & { id?: string }): Promise<BlogPost> {
  await requireRole(['admin']);
  const supabase = await createClient();

  // blog_posts.slug is UNIQUE; a clash is checked here so the manager can show a readable
  // message instead of a 502 carrying a Postgres constraint name.
  const clash = unwrap(
    await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', input.slug.trim())
      .neq('id', input.id ?? '00000000-0000-0000-0000-000000000000')
      .maybeSingle(),
    'Check blog slug',
  );
  if (clash) throw new HttpError(409, 'That slug is already used by another post');

  const query = input.id
    ? supabase.from('blog_posts').update(blogPostValues(input)).eq('id', input.id)
    : supabase.from('blog_posts').insert(blogPostValues(input));

  const row = unwrap(
    await query.select('*, category:blog_categories(name, slug)').maybeSingle(),
    input.id ? 'Update blog post' : 'Create blog post',
  );
  if (!row) throw new HttpError(404, 'That blog post does not exist');
  return row as unknown as BlogPost;
}

export async function deleteBlogPost(postId: string): Promise<void> {
  await requireRole(['admin']);
  const supabase = await createClient();
  const removed = unwrap(
    await supabase.from('blog_posts').delete().eq('id', postId).select('id'),
    'Delete blog post',
  );
  if ((removed ?? []).length === 0) throw new HttpError(404, 'That blog post does not exist');
}

export async function getBlogCategories(): Promise<BlogCategory[]> {
  await requireRole(['admin']);
  const supabase = await createClient();
  const rows = unwrap(
    await supabase.from('blog_categories').select('id, name, slug, posts:blog_posts(count)').order('name'),
    'Load blog categories',
  );
  return (rows ?? []).map((row: Record<string, any>) => ({
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    post_count: Number(row.posts?.[0]?.count ?? 0),
  }));
}

export async function createBlogCategory(name: string): Promise<BlogCategory> {
  await requireRole(['admin']);
  const supabase = await createClient();
  const slug = slugify(name);
  const clash = unwrap(
    await supabase.from('blog_categories').select('id').eq('slug', slug).maybeSingle(),
    'Check blog category',
  );
  if (clash) throw new HttpError(409, 'A blog category with that name already exists');

  const row = unwrap(
    await supabase.from('blog_categories').insert({ name: name.trim(), slug }).select('id, name, slug').single(),
    'Create blog category',
  );
  if (!row) throw new HttpError(502, 'The blog category was created but not returned');
  return { id: row.id, name: row.name, slug: row.slug, post_count: 0 };
}

// A category owns its posts through ON DELETE CASCADE, so the caller has to say
// in advance how many posts would disappear with it.
export async function deleteBlogCategory(categoryId: string): Promise<void> {
  await requireRole(['admin']);
  const supabase = await createClient();
  const removed = unwrap(
    await supabase.from('blog_categories').delete().eq('id', categoryId).select('id'),
    'Delete blog category',
  );
  if ((removed ?? []).length === 0) throw new HttpError(404, 'That blog category does not exist');
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const supabase = await createClient();
  const row = unwrap(await supabase.from('site_settings').select('*').limit(1).maybeSingle(), 'Load site settings');
  if (!row) throw new HttpError(500, 'site_settings has no row. Apply the seed data or create one in the database.');
  return row as SiteSettings;
}

// Admin-only: the footer, the contact page and the document title all read this
// row, so the values have to be editable somewhere other than the database.
export async function updateSiteSettings(input: {
  site_title: string;
  site_description: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  facebook_url?: string | null;
  instagram_url?: string | null;
  twitter_url?: string | null;
  youtube_url?: string | null;
}): Promise<SiteSettings> {
  await requireRole(['admin']);
  const supabase = await createClient();
  const row = unwrap(
    await supabase
      .from('site_settings')
      .update({
        site_title: input.site_title,
        site_description: input.site_description,
        contact_email: input.contact_email,
        contact_phone: input.contact_phone,
        address: input.address,
        facebook_url: input.facebook_url || null,
        instagram_url: input.instagram_url || null,
        twitter_url: input.twitter_url || null,
        youtube_url: input.youtube_url || null,
      })
      .eq('id', (await getSiteSettings()).id)
      .select('*')
      .single(),
    'Save site settings',
  );
  return row as SiteSettings;
}

// The footer form used to only flip a local "subscribed" flag. An address is
// stored now; re-subscribing the same address is treated as success, not an
// error, because the unique index is on lower(email).
export async function subscribeNewsletter(email: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('newsletter_subscribers')
    .insert({ email: email.trim().toLowerCase() });
  // The address is already on the list — that is a success, not a failure.
  if (error?.code === '23505') return;
  unwrap({ data: null, error }, 'Subscribe to newsletter');
}

// BANNERS --------------------------------------------------------------------

export async function getBanners(placement: BannerPlacement): Promise<Banner[]> {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from('banners')
      .select('*')
      .eq('placement', placement)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    'Load banners',
  );
  return (rows ?? []) as unknown as Banner[];
}

export async function getAllBanners(): Promise<Banner[]> {
  await requireRole(['admin']);
  const supabase = await createClient();
  const rows = unwrap(
    await supabase.from('banners').select('*').order('placement').order('sort_order', { ascending: true }),
    'Load banners',
  );
  return (rows ?? []) as unknown as Banner[];
}

export async function saveBanner(input: {
  id?: string;
  placement: BannerPlacement;
  category_id?: string | null;
  title: string;
  subtitle?: string | null;
  button_text?: string | null;
  link_url: string;
  image_url?: string | null;
  background_color?: string | null;
  sort_order?: number;
  is_active?: boolean;
}): Promise<Banner> {
  await requireRole(['admin']);
  const supabase = await createClient();

  const values = {
    placement: input.placement,
    category_id: input.placement === 'category_showcase' ? (input.category_id ?? null) : null,
    title: input.title,
    subtitle: input.subtitle || null,
    button_text: input.button_text || null,
    link_url: input.link_url,
    image_url: input.image_url || null,
    background_color: input.background_color || null,
    sort_order: input.sort_order ?? 0,
    is_active: input.is_active !== false,
  };

  const row = unwrap(
    input.id
      ? await supabase.from('banners').update(values).eq('id', input.id).select('*').maybeSingle()
      : await supabase.from('banners').insert(values).select('*').single(),
    'Save banner',
  );
  if (!row) throw new HttpError(404, 'That banner no longer exists.');
  return row as unknown as Banner;
}

export async function deleteBanner(bannerId: string): Promise<void> {
  await requireRole(['admin']);
  const supabase = await createClient();
  const { data, error } = await supabase.from('banners').delete().eq('id', bannerId).select('id');
  unwrap({ data, error }, 'Delete banner');
  if (!data || data.length === 0) throw new HttpError(404, 'That banner no longer exists.');
}

// CART (authenticated only) --------------------------------------------------

async function myCart(): Promise<{ cartId: string; profile: Profile }> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const cartId = unwrap(await supabase.rpc('my_cart_id'), 'Open cart');
  if (!cartId) throw new HttpError(500, 'Cart could not be created');
  return { cartId: cartId as string, profile };
}

async function loadCart(cartId: string, profile: Profile): Promise<Cart> {
  const supabase = await createClient();
  const rows = unwrap(
    await supabase.from('cart_items').select(CART_ITEM_SELECT).eq('cart_id', cartId).order('created_at'),
    'Load cart',
  );

  const items = (rows ?? []).map(mapCartRow).filter((i): i is CartItem => i !== null);
  const subtotal = cartSubtotal(items);
  return { id: cartId, user_id: profile.id, items, subtotal, discount: 0, total: subtotal };
}

export async function getCart(): Promise<Cart> {
  const { cartId, profile } = await myCart();
  return loadCart(cartId, profile);
}

export async function addToCart(productId: string, quantity = 1, variantId?: string | null): Promise<Cart> {
  const { cartId, profile } = await myCart();
  const supabase = await createClient();
  unwrap(
    await supabase.rpc('cart_add_item', {
      p_product_id: productId,
      p_quantity: Math.max(1, Math.trunc(quantity)),
      p_variant_id: variantId ?? null,
    }),
    'Add to cart',
  );
  return loadCart(cartId, profile);
}

export async function updateCartQuantity(itemId: string, quantity: number): Promise<Cart> {
  const { cartId, profile } = await myCart();
  const supabase = await createClient();
  unwrap(
    await supabase.rpc('cart_set_quantity', { p_item_id: itemId, p_quantity: Math.trunc(quantity) }),
    'Update cart',
  );
  return loadCart(cartId, profile);
}

export async function removeFromCart(itemId: string): Promise<Cart> {
  const { cartId, profile } = await myCart();
  const supabase = await createClient();
  unwrap(await supabase.rpc('cart_remove_item', { p_item_id: itemId }), 'Remove from cart');
  return loadCart(cartId, profile);
}

// Replaces the saved cart with the client's copy, used when a visitor signs in
// and their local cart becomes the server cart. Lines that no longer exist as
// published products are dropped; a database failure is raised, not skipped.
export async function syncCart(
  items: Array<{ product_id: string; variant_id?: string | null; quantity: number }>,
): Promise<Cart> {
  const { cartId, profile } = await myCart();
  const supabase = await createClient();

  const wanted = [...new Set(items.map((i) => i.product_id))];
  const live = wanted.length
    ? unwrap(await supabase.from('products').select('id').in('id', wanted).eq('status', 'published'), 'Validate cart')
    : [];
  const liveIds = new Set((live ?? []).map((row) => row.id as string));

  unwrap(await supabase.rpc('cart_clear'), 'Clear cart');

  for (const item of items) {
    if (!liveIds.has(item.product_id)) continue;
    unwrap(
      await supabase.rpc('cart_add_item', {
        p_product_id: item.product_id,
        p_quantity: Math.max(1, Math.trunc(item.quantity || 1)),
        p_variant_id: item.variant_id ?? null,
      }),
      'Sync cart',
    );
  }

  return loadCart(cartId, profile);
}

export async function clearCart(): Promise<Cart> {
  const { cartId, profile } = await myCart();
  const supabase = await createClient();
  unwrap(await supabase.rpc('cart_clear'), 'Clear cart');
  return loadCart(cartId, profile);
}

// WISHLIST -------------------------------------------------------------------

export async function getWishlist(): Promise<Product[]> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const rows = unwrap(
    await supabase.from('wishlists').select('product_id').eq('user_id', profile.id).order('created_at'),
    'Load wishlist',
  );
  const ids = (rows ?? []).map((r) => r.product_id as string);
  if (ids.length === 0) return [];

  const products = unwrap(
    await supabase.from('products').select(PRODUCT_SELECT).in('id', ids),
    'Load wishlist products',
  );
  const byId = new Map(
    (products ?? []).map((row: Record<string, any>) => [row.id as string, mapProduct(row)]),
  );
  return ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
}

export async function toggleWishlist(productId: string): Promise<{ inWishlist: boolean }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const existing = unwrap(
    await supabase.from('wishlists').select('id').eq('user_id', profile.id).eq('product_id', productId).maybeSingle(),
    'Load wishlist entry',
  );

  if (existing) {
    unwrap(
      await supabase.from('wishlists').delete().eq('id', existing.id as string).eq('user_id', profile.id),
      'Remove from wishlist',
    );
    return { inWishlist: false };
  }

  unwrap(
    await supabase.from('wishlists').insert({ user_id: profile.id, product_id: productId }),
    'Add to wishlist',
  );
  return { inWishlist: true };
}

// ACCOUNT --------------------------------------------------------------------
// Profile and address book. `authenticated` may only write full_name, phone and
// avatar_url on profiles (migration 022), so a direct REST call with a user JWT
// cannot promote itself; role changes stay on the admin route's service client.

export interface ProfileInput {
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
}

export interface AddressInput {
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
}

function addressValues(input: AddressInput) {
  const optional = (value?: string | null) => (value?.trim() ? value.trim() : null);
  return {
    title: input.title.trim(),
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    phone: input.phone.trim(),
    address_line1: input.address_line1.trim(),
    address_line2: optional(input.address_line2),
    country: input.country.trim(),
    state: input.state.trim(),
    city: input.city.trim(),
    postal_code: input.postal_code.trim(),
  };
}

export async function updateMyProfile(input: ProfileInput): Promise<Profile> {
  const profile = await requireProfile();
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from('profiles')
      .update({
        full_name: input.full_name.trim(),
        phone: input.phone?.trim() || null,
        avatar_url: input.avatar_url?.trim() || null,
      })
      .eq('id', profile.id)
      .select('*')
      .single(),
    'Save profile',
  ) as Profile;
}

export async function getMyAddresses(): Promise<UserAddress[]> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', profile.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false }),
    'Load saved addresses',
  );
  return (rows ?? []) as UserAddress[];
}

export async function createMyAddress(input: AddressInput): Promise<UserAddress> {
  const profile = await requireProfile();
  const supabase = await createClient();
  // is_default is left to the database: the first address of a user becomes the default.
  return unwrap(
    await supabase
      .from('user_addresses')
      .insert({ user_id: profile.id, ...addressValues(input) })
      .select('*')
      .single(),
    'Save address',
  ) as UserAddress;
}

export async function updateMyAddress(addressId: string, input: AddressInput): Promise<UserAddress> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const row = unwrap(
    await supabase
      .from('user_addresses')
      .update(addressValues(input))
      .eq('id', addressId)
      .eq('user_id', profile.id)
      .select('*')
      .maybeSingle(),
    'Update address',
  );
  if (!row) throw new HttpError(404, 'That address is not in your account');
  return row as UserAddress;
}

export async function deleteMyAddress(addressId: string): Promise<void> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const removed = unwrap(
    await supabase
      .from('user_addresses')
      .delete()
      .eq('id', addressId)
      .eq('user_id', profile.id)
      .select('id'),
    'Delete address',
  );
  if ((removed ?? []).length === 0) throw new HttpError(404, 'That address is not in your account');
}

export async function setDefaultMyAddress(addressId: string): Promise<UserAddress> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const rows = unwrap(
    await supabase.rpc('set_default_address', { p_address_id: addressId }),
    'Set default address',
  );
  const row = (rows ?? [])[0] as UserAddress | undefined;
  if (!row) throw new HttpError(404, 'That address is not in your account');
  return row;
}

// CHECKOUT -------------------------------------------------------------------

export async function getCheckoutContext(): Promise<{ profile: Profile; address: UserAddress | null; rules: CheckoutRules }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const rows = unwrap(
    await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', profile.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1),
    'Load saved address',
  );

  const address = (rows ?? [])[0] as UserAddress | undefined;
  return { profile, address: address ?? null, rules: await getCheckoutRules() };
}

export interface CheckoutRules {
  base_currency: string;
  free_shipping_threshold: number;
  flat_shipping_fee: number;
}

export async function getCheckoutRules(): Promise<CheckoutRules> {
  const supabase = await createClient();
  const rules = unwrap(await supabase.rpc('checkout_rules'), 'Load checkout rules');
  const value = rules as unknown as CheckoutRules;
  return {
    base_currency: value.base_currency,
    free_shipping_threshold: money(value.free_shipping_threshold),
    flat_shipping_fee: money(value.flat_shipping_fee),
  };
}

export async function getCouponDiscount(code: string, subtotal: number): Promise<number> {
  if (!code) return 0;
  const supabase = await createClient();
  const discount = unwrap(
    await supabase.rpc('coupon_discount', { p_code: code.toUpperCase(), p_subtotal: subtotal }),
    'Validate coupon',
  );
  return money(discount);
}

function mapOrder(row: Record<string, any>, items: OrderItem[]): Order {
  const [mapped] = moneyList([{ ...row, items }], ORDER_MONEY);
  return mapped as unknown as Order;
}

function mapOrderItems(rows: Record<string, any>[]): OrderItem[] {
  return moneyList(rows, ORDER_ITEM_MONEY) as unknown as OrderItem[];
}

export interface PlaceOrderInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: Omit<UserAddress, 'id' | 'user_id'>;
  paymentMethod: string;
  couponCode?: string | null;
  displayCurrency?: string;
  exchangeRate?: number;
  notes?: string | null;
  idempotencyKey: string;
}

// Returns one order per store in the cart: a multi-vendor cart is split so each
// vendor gets their own fulfilable order.
export async function placeOrder(input: PlaceOrderInput): Promise<Order[]> {
  await requireProfile();
  const supabase = await createClient();

  const rows = unwrap(
    await supabase.rpc('place_order', {
      p_customer_name: input.customerName,
      p_customer_email: input.customerEmail,
      p_customer_phone: input.customerPhone,
      p_shipping_address: input.shippingAddress,
      p_payment_method: input.paymentMethod,
      p_coupon_code: input.couponCode?.toUpperCase() || null,
      p_display_currency: input.displayCurrency ?? 'USD',
      p_exchange_rate: input.exchangeRate ?? 1,
      p_notes: input.notes ?? null,
      p_idempotency_key: input.idempotencyKey,
    }),
    'Place order',
  );

  const orders = (rows ?? []) as Record<string, any>[];
  if (orders.length === 0) throw new HttpError(502, 'Order could not be created');

  const ids = orders.map((o) => o.id as string);
  const itemRows = unwrap(
    // order_items snapshots have no timestamp; every line of one order is written in the
    // same transaction, so title is the only stable order a receipt can show.
    await supabase.from('order_items').select('*').in('order_id', ids).order('product_title'),
    'Load order items',
  );

  const grouped = new Map<string, OrderItem[]>();
  for (const item of itemRows ?? []) {
    const list = grouped.get(item.order_id as string) ?? [];
    list.push(item);
    grouped.set(item.order_id as string, list);
  }

  return orders.map((order) => mapOrder(order, mapOrderItems(grouped.get(order.id as string) ?? [])));
}

const ORDER_SELECT = `
  *,
  items:order_items(*),
  store:stores(*)
`;

export async function getOrders(): Promise<Order[]> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const rows = unwrap(
    await supabase.from('orders').select(ORDER_SELECT).eq('user_id', profile.id).order('created_at', { ascending: false }),
    'Load orders',
  );
  return (rows ?? []).map((row: Record<string, any>) =>
    mapOrder(row, mapOrderItems(row.items ?? [])),
  );
}

// RLS restricts this to the buyer, the owning seller, or an admin. A row that
// exists but is not readable comes back as null, which callers turn into 404 —
// so another user's order cannot be probed for existence.
export async function getOrderById(idOrNumber: string): Promise<Order | null> {
  const supabase = await createClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrNumber);
  const column = isUuid ? 'id' : 'order_number';

  const row = unwrap(
    await supabase.from('orders').select(ORDER_SELECT).eq(column, idOrNumber).maybeSingle(),
    'Load order',
  );
  if (!row) return null;
  return mapOrder(row, mapOrderItems(row.items ?? []));
}

// SELLER ---------------------------------------------------------------------

// Includes the seller's own drafts, which the storefront query deliberately hides.
export async function getSellerProducts(): Promise<Product[]> {
  const storeIds = await getMyStoreIds();
  if (storeIds.length === 0) return [];

  const supabase = await createClient();
  const rows = unwrap(
    await supabase.from('products').select(PRODUCT_SELECT).in('store_id', storeIds).order('created_at', { ascending: false }),
    'Load my products',
  );
  return (rows ?? []).map(mapProduct).filter((p): p is Product => p !== null);
}

export async function getSellerOrders(): Promise<Order[]> {
  const storeIds = await getMyStoreIds();
  if (storeIds.length === 0) return [];

  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .in('store_id', storeIds)
      .order('created_at', { ascending: false }),
    'Load seller orders',
  );
  return (rows ?? []).map((row: Record<string, any>) => mapOrder(row, mapOrderItems(row.items ?? [])));
}

export async function createProduct(input: {
  title: string;
  slug: string;
  sku: string;
  description: string;
  category_id: string;
  price: number;
  discount_rate: number;
  stock: number;
  is_digital?: boolean;
  is_featured?: boolean;
  is_special_offer?: boolean;
  status?: 'draft' | 'pending' | 'published';
  image_url?: string | null;
}): Promise<Product> {
  await requireRole(['seller', 'admin']);
  const store = await getMyStore();
  if (!store) throw new HttpError(403, 'You need a store before you can list products.');

  // discounted_price is derived, never accepted from the client.
  const discounted = Math.round(input.price * (1 - input.discount_rate / 100) * 100) / 100;

  const supabase = await createClient();
  const row = unwrap(
    await supabase
      .from('products')
      .insert({
        store_id: store.id,
        category_id: input.category_id,
        title: input.title,
        slug: input.slug,
        sku: input.sku,
        description: input.description,
        price: input.price,
        discount_rate: input.discount_rate,
        discounted_price: discounted,
        stock: input.stock,
        is_digital: input.is_digital ?? false,
        is_featured: input.is_featured ?? false,
        is_special_offer: input.is_special_offer ?? false,
        status: input.status ?? 'draft',
      })
      .select(PRODUCT_SELECT)
      .single(),
    'Create product',
  );

  if (input.image_url) {
    unwrap(
      await supabase
        .from('product_images')
        .insert({ product_id: row.id, image_url: input.image_url, is_primary: true, sort_order: 1 }),
      'Save product image',
    );
  }

  return mapProduct(row) as Product;
}

// RLS lets the owning seller and admins write products. A DELETE/UPDATE that
// matches no readable row is a PostgREST success with an empty result, so the
// empty result is checked here — otherwise moderation would report a silent
// no-op as saved.
export async function deleteProduct(productId: string): Promise<void> {
  await requireRole(['seller', 'admin']);
  const supabase = await createClient();
  const rows = unwrap(
    await supabase.from('products').delete().eq('id', productId).select('id'),
    'Delete product',
  );
  if ((rows ?? []).length === 0) throw new HttpError(404, 'Product not found or not yours to delete.');
}

export async function updateProductStatus(productId: string, status: 'draft' | 'pending' | 'published'): Promise<void> {
  await requireRole(['seller', 'admin']);
  const supabase = await createClient();
  const rows = unwrap(
    await supabase.from('products').update({ status }).eq('id', productId).select('id'),
    'Update product',
  );
  if ((rows ?? []).length === 0) throw new HttpError(404, 'Product not found or not yours to change.');
}

// Homepage curation switches, admin-only in the UI and enforced by RLS.
export async function updateProductModeration(
  productId: string,
  patch: { is_featured?: boolean; is_special_offer?: boolean },
): Promise<void> {
  await requireRole(['admin']);
  const supabase = await createClient();
  const rows = unwrap(
    await supabase.from('products').update(patch).eq('id', productId).select('id'),
    'Moderate product',
  );
  if ((rows ?? []).length === 0) throw new HttpError(404, 'Product not found.');
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  paymentStatus?: string,
): Promise<Order> {
  await requireRole(['seller', 'admin']);
  const supabase = await createClient();
  const rows = unwrap(
    await supabase.rpc('update_order_status', {
      p_order_id: orderId,
      p_status: status,
      p_payment_status: paymentStatus ?? null,
    }),
    'Update order',
  );
  const row = (rows ?? [])[0] as Record<string, any> | undefined;
  if (!row) throw new HttpError(404, 'Order not found or not yours to change');
  return mapOrder(row, []);
}

export async function submitReview(productId: string, rating: number, reviewText: string): Promise<string> {
  await requireProfile();
  const supabase = await createClient();
  const id = unwrap(
    await supabase.rpc('submit_review', {
      p_product_id: productId,
      p_rating: Math.trunc(rating),
      p_review_text: reviewText,
    }),
    'Save review',
  );
  return id as string;
}

// ADMIN ----------------------------------------------------------------------

// Public counters for the about page. These are counted under the same RLS
// policies a visitor is subject to, so the numbers describe what is actually
// browsable rather than the whole table.
export async function getPlatformStats(): Promise<{ products: number; stores: number; categories: number; reviews: number }> {
  const supabase = await createClient();
  const [products, stores, categories, reviews] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('stores').select('id', { count: 'exact', head: true }),
    supabase.from('categories').select('id', { count: 'exact', head: true }),
    supabase.from('product_reviews').select('id', { count: 'exact', head: true }),
  ]);

  unwrap(products, 'Count products');
  unwrap(stores, 'Count stores');
  unwrap(categories, 'Count categories');
  unwrap(reviews, 'Count reviews');

  return {
    products: products.count ?? 0,
    stores: stores.count ?? 0,
    categories: categories.count ?? 0,
    reviews: reviews.count ?? 0,
  };
}

export async function getAdminStats() {
  await requireRole(['admin']);
  const supabase = await createClient();

  const [products, orders, stores, users, revenue] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('stores').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('total').eq('payment_status', 'paid'),
  ]);

  unwrap(products, 'Count products');
  unwrap(orders, 'Count orders');
  unwrap(stores, 'Count stores');
  unwrap(users, 'Count users');
  const revenueRows = unwrap(revenue, 'Sum revenue');

  const totalRevenue = (revenueRows ?? []).reduce((sum: number, row) => sum + money(row.total), 0);

  return {
    totalProducts: products.count ?? 0,
    totalOrders: orders.count ?? 0,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalStores: stores.count ?? 0,
    totalUsers: users.count ?? 0,
  };
}

export async function getAllOrders(): Promise<Order[]> {
  await requireRole(['admin']);
  const supabase = await createClient();
  const rows = unwrap(
    await supabase.from('orders').select(ORDER_SELECT).order('created_at', { ascending: false }),
    'Load orders',
  );
  return (rows ?? []).map((row: Record<string, any>) => mapOrder(row, mapOrderItems(row.items ?? [])));
}

export async function getAllProducts(): Promise<Product[]> {
  await requireRole(['admin']);
  const supabase = await createClient();
  const rows = unwrap(
    await supabase.from('products').select(PRODUCT_SELECT).order('created_at', { ascending: false }),
    'Load products',
  );
  return (rows ?? []).map(mapProduct).filter((p): p is Product => p !== null);
}

// A vendor's store list is read through the stores FK embed; RLS keeps stores
// public-readable, so the join cannot leak rows the caller could not already see.
export interface AdminUser extends Profile {
  store_names: string[];
}

export async function getAllUsers(): Promise<AdminUser[]> {
  await requireRole(['admin']);
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from('profiles')
      .select('*, stores(title)')
      .order('created_at', { ascending: false }),
    'Load users',
  );
  return (rows ?? []).map((row: Record<string, any>) => {
    const { stores, ...profile } = row;
    return {
      ...(profile as Profile),
      store_names: (stores ?? []).map((s: { title: string }) => s.title),
    };
  });
}

// profiles.role is not writable by the authenticated role (see 006 column
// grants), so an intentional admin action is the one place the service-role
// client is used. requireRole() runs first as the actual authorization check.
export async function updateUserRole(userId: string, role: UserRole): Promise<Profile> {
  await requireRole(['admin']);
  const admin = await createAdminClient();
  const row = unwrap(
    await admin.from('profiles').update({ role }).eq('id', userId).select('*').single(),
    'Update user role',
  );
  return row as Profile;
}

export async function createCategory(input: {
  name: string;
  slug: string;
  image_url?: string | null;
  parent_id?: string | null;
  sort_order?: number;
}): Promise<Category> {
  await requireRole(['admin']);
  const supabase = await createClient();
  const row = unwrap(
    await supabase
      .from('categories')
      .insert({
        name: input.name,
        slug: input.slug,
        image_url: input.image_url ?? null,
        parent_id: input.parent_id ?? null,
        sort_order: input.sort_order ?? 0,
      })
      .select('*')
      .single(),
    'Create category',
  );
  return row as Category;
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await requireRole(['admin']);
  const supabase = await createClient();
  const { error } = await supabase.from('categories').delete().eq('id', categoryId);
  if (error?.code === '23503') {
    throw new HttpError(409, 'This category still has products. Move or delete them first.');
  }
  unwrap({ data: null, error }, 'Delete category');
}

export async function getContactMessages(): Promise<ContactMessage[]> {
  await requireRole(['admin']);
  const supabase = await createClient();
  const rows = unwrap(
    await supabase
      .from('contact_messages')
      .select('id, name, email, subject, message, status, product_id, created_at, product:products!contact_messages_product_id_fkey (slug, title)')
      // 'unread' > 'read', so descending opens the inbox on what nobody has handled yet.
      .order('status', { ascending: false })
      .order('created_at', { ascending: false }),
    'Load messages',
  );
  return (rows ?? []) as unknown as ContactMessage[];
}

// Only the two states the contact_messages_status_check constraint allows, and the
// row is read back to prove the write landed instead of assuming it did.
export async function markContactMessage(id: string, status: ContactMessageStatus): Promise<void> {
  await requireRole(['admin']);
  const supabase = await createClient();
  const row = unwrap(
    await supabase
      .from('contact_messages')
      .update({ status })
      .eq('id', id)
      .select('id')
      .maybeSingle(),
    'Update message status',
  );
  if (!row) throw new HttpError(404, 'That message no longer exists.');
}

export async function submitContactMessage(input: {
  name: string;
  email: string;
  message: string;
  subject?: string | null;
  product_id?: string | null;
}): Promise<void> {
  const supabase = await createClient();
  unwrap(
    await supabase
      .from('contact_messages')
      .insert({
        name: input.name,
        email: input.email,
        message: input.message,
        subject: input.subject ?? null,
        product_id: input.product_id ?? null,
        status: 'unread',
      }),
    'Send message',
  );
}
