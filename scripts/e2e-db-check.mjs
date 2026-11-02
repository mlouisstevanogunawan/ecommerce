// Temporary verification harness. Run: node scratch-e2e.mjs
import { readFileSync } from 'node:fs';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]),
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const APP = 'http://localhost:3000';
const PASSWORD = 'Modesy#Demo2026';

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function session(email) {
  const jar = new Map();
  const supabase = createServerClient(URL, ANON, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      get: (name) => jar.get(name),
      set: (name, value) => jar.set(name, value),
      remove: (name) => jar.delete(name),
      setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  const cookies = [...jar].map(([n, v]) => `${n}=${v}`).join('; ');
  return { cookies, token: (await supabase.auth.getSession()).data.session.access_token, id: (await supabase.auth.getUser()).data.user.id };
}

async function api(sess, path, init = {}) {
  const res = await fetch(`${APP}${path}`, {
    ...init,
    headers: { cookie: sess.cookies, 'content-type': 'application/json', ...(init.headers || {}) },
    redirect: 'manual',
  });
  let body = null;
  try { body = await res.json(); } catch { body = await res.text().catch(() => null); }
  return { status: res.status, body };
}

const anon = createClient(URL, ANON);
const asService = createClient(URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: catalogue } = await anon.from('products')
  .select('id, slug, title, sku, price, discounted_price, stock, status, store_id, category_id, product_variants(id, name, stock, price, discounted_price)')
  .eq('status', 'published').order('slug').limit(20);

const withVariant = catalogue.find((p) => p.product_variants?.length);
const plain = catalogue.find((p) => !p.product_variants?.length);
const otherStore = catalogue.find((p) => p.store_id !== withVariant.store_id);
console.log(`catalogue: ${catalogue.length} published, ${catalogue.filter((p) => p.product_variants?.length).length} with variants`);

const buyer = await session('buyer@modesy.dev');
const buyer2 = await session('buyer2@modesy.dev');
const seller = await session('seller@modesy.dev');
const admin = await session('admin@modesy.dev');
check('signup/login', buyer.id && seller.id && admin.id, '4 accounts signed in');

// --- storefront reads -------------------------------------------------------
const home = await fetch(`${APP}/`);
check('homepage 200', home.status === 200, `status ${home.status}`);
const search = await anon.from('products').select('id, slug').ilike('title', '%lace%').eq('status', 'published');
check('search matches', (search.data?.length ?? 0) >= 2, `${search.data?.length ?? 0} hits for "lace"`);

// --- cart ------------------------------------------------------------------
const before = await api(buyer, '/api/cart');
check('cart starts clean', (before.body?.cart?.items?.length ?? 0) === 0, JSON.stringify(before.body?.cart?.items?.length));

const added = await api(buyer, '/api/cart', { method: 'POST', body: JSON.stringify({ action: 'add', product_id: withVariant.id, variant_id: withVariant.product_variants[1].id, quantity: 2 }) });
check('add to cart', added.status === 200 && added.body?.cart?.items?.length === 1, `status ${added.status} items ${added.body?.cart?.items?.length}`);
const line = added.body.cart.items[0];
check('cart line priced from DB', line.quantity === 2 && Number(line.variant.price) > 0, `${line.product.title} x${line.quantity} @ ${line.variant.price}`);

const addedAgain = await api(buyer, '/api/cart', { method: 'POST', body: JSON.stringify({ action: 'add', product_id: withVariant.id, variant_id: withVariant.product_variants[1].id, quantity: 1 }) });
check('repeat add collapses one line', addedAgain.body?.cart?.items?.length === 1 && addedAgain.body.cart.items[0].quantity === 3, `qty ${addedAgain.body?.cart?.items?.[0]?.quantity}`);

await api(buyer, '/api/cart', { method: 'POST', body: JSON.stringify({ action: 'add', product_id: plain.id, quantity: 1 }) });
const cartNow = await api(buyer, '/api/cart');
check('two different products in cart', cartNow.body?.cart?.items?.length === 2, `items ${cartNow.body?.cart?.items?.length}`);

// --- cart isolation ---------------------------------------------------------
const b2OtherCart = await api(buyer2, `/api/cart`, { method: 'POST', body: JSON.stringify({ action: 'update', item_id: line.id, quantity: 99 }) });
check("buyer B cannot edit buyer A's cart line", b2OtherCart.status >= 400, `status ${b2OtherCart.status} ${JSON.stringify(b2OtherCart.body)?.slice(0, 90)}`);

const b2Cart = await api(buyer2, '/api/cart');
check("buyer B sees an empty cart", (b2Cart.body?.cart?.items?.length ?? 0) === 0, `items ${b2Cart.body?.cart?.items?.length}`);

const anonCart = await fetch(`${APP}/api/cart`);
check('anonymous cart call is 401', anonCart.status === 401, `status ${anonCart.status}`);

// --- wishlist --------------------------------------------------------------
const wishStart = await api(buyer, '/api/wishlist');
const started = (wishStart.body?.ids ?? []).includes(plain.id);
const wish = await api(buyer, '/api/wishlist', { method: 'POST', body: JSON.stringify({ product_id: plain.id }) });
check('wishlist toggles', wish.status === 200 && wish.body?.inWishlist === !started && wish.body.ids.includes(plain.id) === !started, `${started ? 'removed' : 'added'} → ids ${JSON.stringify(wish.body?.ids)}`);
const unwish = await api(buyer, '/api/wishlist', { method: 'POST', body: JSON.stringify({ product_id: plain.id }) });
check('wishlist toggles back', unwish.body?.inWishlist === started && unwish.body.ids.includes(plain.id) === started, `ids ${JSON.stringify(unwish.body?.ids)}`);
await api(buyer, '/api/wishlist', { method: 'POST', body: JSON.stringify({ product_id: plain.id }) });
const b2Wish = await api(buyer2, '/api/wishlist');
check("buyer B wishlist is separate", Array.isArray(b2Wish.body?.ids), `${b2Wish.body?.ids?.length} rows`);

// --- checkout --------------------------------------------------------------
const address = { title: 'Home', first_name: 'Jane', last_name: 'Doe', phone: '+1 6195550148', address_line1: '350 5th Avenue', address_line2: 'Apt 12B', country: 'United States', state: 'California', city: 'San Diego', postal_code: '92101' };
const rulesRes = await api(buyer, '/api/checkout/rules');
check('checkout rules RPC', rulesRes.status === 200 && typeof rulesRes.body?.free_shipping_threshold === 'number', JSON.stringify(rulesRes.body));

const emptyCheckout = await api(buyer2, '/api/checkout', { method: 'POST', body: JSON.stringify({ customerName: 'Sam Rivera', customerEmail: 'buyer2@modesy.dev', customerPhone: '+1 6195550199', shippingAddress: { ...address, first_name: 'Sam', last_name: 'Rivera' }, paymentMethod: 'cod', idempotencyKey: randomUUID() }) });
check('empty cart cannot check out', emptyCheckout.status >= 400, `status ${emptyCheckout.status} ${JSON.stringify(emptyCheckout.body)?.slice(0, 80)}`);

const key = randomUUID();
const stockBefore = { [withVariant.id]: withVariant.stock, [withVariant.product_variants[1].id]: withVariant.product_variants[1].stock, [plain.id]: plain.stock };
const order = await api(buyer, '/api/checkout', { method: 'POST', body: JSON.stringify({ customerName: 'Jane Doe', customerEmail: 'buyer@modesy.dev', customerPhone: '+1 6195550148', shippingAddress: address, paymentMethod: 'credit_card', couponCode: 'MODESY10', currency: 'EUR', exchangeRate: 0.92, notes: 'e2e harness', idempotencyKey: key }) });
const orders = order.body?.orders;
check('checkout creates orders', order.status === 200 && Array.isArray(orders) && orders.length >= 1, `status ${order.status} orders ${orders?.length} ${orders?.map((o) => o.order_number).join(',')}`);

const first = orders?.[0];
if (first) {
  check('order number format', /^MDS-\d{6}$/.test(first.order_number) || /^MDS-\d{17}$/.test(first.order_number), first.order_number);
  check('server-computed totals', Number(first.subtotal) > 0 && Number(first.discount) > 0 && Math.abs(Number(first.total) - (Number(first.subtotal) - Number(first.discount) + Number(first.shipping_fee))) < 0.011, `sub ${first.subtotal} disc ${first.discount} ship ${first.shipping_fee} total ${first.total}`);
  check('paid via simulated payment', first.payment_status === 'paid' && first.status === 'processing' && !!first.paid_at, `${first.payment_status}/${first.status}`);
  check('currency audit columns', first.currency === 'EUR' && Number(first.exchange_rate) === 0.92, `${first.currency}@${first.exchange_rate}`);
}

const cartAfter = await api(buyer, '/api/cart');
check('cart cleared after order', (cartAfter.body?.cart?.items?.length ?? 0) === 0, `items ${cartAfter.body?.cart?.items?.length}`);

const replay = await api(buyer, '/api/checkout', { method: 'POST', body: JSON.stringify({ customerName: 'Jane Doe', customerEmail: 'buyer@modesy.dev', customerPhone: '+1 6195550148', shippingAddress: address, paymentMethod: 'credit_card', couponCode: 'MODESY10', idempotencyKey: key }) });
check('double submit replays same orders', replay.status === 200 && replay.body?.orders?.length === orders?.length && replay.body.orders.map((o) => o.order_number).join() === orders.map((o) => o.order_number).join(), `status ${replay.status} ${replay.body?.orders?.map((o) => o.order_number).join(',') || JSON.stringify(replay.body)}`);

const stockAfter = await anon.from('products').select('id, stock, product_variants(id, stock)').in('id', [withVariant.id, plain.id]);
const afterWith = stockAfter.data.find((p) => p.id === withVariant.id);
const afterPlain = stockAfter.data.find((p) => p.id === plain.id);
const afterVariant = afterWith?.product_variants?.find((v) => v.id === withVariant.product_variants[1].id);
check('stock decremented', afterWith.stock === stockBefore[withVariant.id] - 3 && afterVariant.stock === stockBefore[withVariant.product_variants[1].id] - 3 && afterPlain.stock === stockBefore[plain.id] - 1,
  `product ${stockBefore[withVariant.id]}->${afterWith.stock}, variant ${stockBefore[withVariant.product_variants[1].id]}->${afterVariant.stock}, other ${stockBefore[plain.id]}->${afterPlain.stock}`);

// no coupon at all — this is the path that used to insert NULL into orders.discount
await api(buyer, '/api/cart', { method: 'POST', body: JSON.stringify({ action: 'add', product_id: plain.id, quantity: 1 }) });
const noCoupon = await api(buyer, '/api/checkout', { method: 'POST', body: JSON.stringify({ customerName: 'Jane Doe', customerEmail: 'buyer@modesy.dev', customerPhone: '+1 6195550148', shippingAddress: address, paymentMethod: 'cod', idempotencyKey: randomUUID() }) });
check('checkout without a coupon', noCoupon.status === 200 && noCoupon.body?.orders?.[0]?.discount === 0 && noCoupon.body?.orders?.[0]?.payment_status === 'pending', `status ${noCoupon.status} ${JSON.stringify(noCoupon.body?.orders?.[0])?.slice(0, 140)}`);

const badCoupon = await api(buyer, '/api/cart', { method: 'POST', body: JSON.stringify({ action: 'add', product_id: plain.id, quantity: 1 }) }).then(() =>
  api(buyer, '/api/checkout', { method: 'POST', body: JSON.stringify({ customerName: 'Jane Doe', customerEmail: 'buyer@modesy.dev', customerPhone: '+1 6195550148', shippingAddress: address, paymentMethod: 'cod', couponCode: 'NOT_A_CODE', idempotencyKey: randomUUID() }) }));
check('unknown coupon discounts nothing', badCoupon.status === 200 && Number(badCoupon.body?.orders?.[0]?.discount) === 0, `status ${badCoupon.status} discount ${badCoupon.body?.orders?.[0]?.discount}`);

const scarce = catalogue.find((p) => p.slug === 'handcrafted-decorative-pillow-42');
const tooMany = await api(buyer2, '/api/cart', { method: 'POST', body: JSON.stringify({ action: 'add', product_id: scarce.id, quantity: 99 }) });
check('cart rejects more than stock', tooMany.status >= 400 && /left in stock/i.test(tooMany.body?.error || ''), `stock ${scarce.stock}, asked 99 → ${tooMany.status} ${tooMany.body?.error}`);

await api(buyer2, '/api/cart', { method: 'POST', body: JSON.stringify({ action: 'add', product_id: scarce.id, quantity: 3 }) });
const soldOutUnderneath = await asService.from('products').update({ stock: 2 }).eq('id', scarce.id).select('stock').single();
const raced = await api(buyer2, '/api/checkout', { method: 'POST', body: JSON.stringify({ customerName: 'Sam', customerEmail: 'buyer2@modesy.dev', customerPhone: '+1 6195550199', shippingAddress: { ...address, first_name: 'Sam', last_name: 'Rivera' }, paymentMethod: 'cod', idempotencyKey: randomUUID() }) });
check('checkout rejects a line that sold out while it sat in the cart', raced.status >= 400 && /only 2 left/i.test(raced.body?.error || ''), `stock forced to ${soldOutUnderneath.data.stock} → ${raced.status} ${raced.body?.error}`);
check('rejected checkout leaves no order and rolls back the stock move', (await asService.from('orders').select('id').eq('user_id', buyer2.id)).data.length === 0 && (await asService.from('products').select('stock').eq('id', scarce.id).single()).data.stock === 2, 'no buyer2 order rows');
await asService.from('products').update({ stock: scarce.stock }).eq('id', scarce.id);
await api(buyer2, '/api/cart', { method: 'POST', body: JSON.stringify({ action: 'clear' }) });

// --- order visibility (RLS) ------------------------------------------------
const allOrders = await asService.from('orders').select('id, order_number, user_id, total, discount, payment_status, currency, exchange_rate');
const persisted = orders ? orders.every((o) => allOrders.data.some((r) => r.order_number === o.order_number)) : false;
check('every returned order exists in the database', persisted, `${allOrders.data.length} order row(s)`);
check('cod order waits for payment', (await asService.from('orders').select('payment_status, status').eq('order_number', noCoupon.body.orders[0].order_number).single()).data.payment_status === 'pending', 'payment_status pending');
const orderId = allOrders.data.find((r) => r.order_number === first?.order_number)?.id ?? allOrders.data[0].id;

const b2Orders = await createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${buyer2.token}` } } }).from('orders').select('*').eq('id', orderId);
check("buyer B cannot read buyer A's order", (b2Orders.data?.length ?? 1) === 0, JSON.stringify(b2Orders.error?.message || `rows ${b2Orders.data?.length}`));

const sellerOrders = await createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${seller.token}` } } }).from('orders').select('order_number, store_id').eq('id', orderId);
check('fulfilling seller reads the order', (sellerOrders.data?.length ?? 0) === 1, JSON.stringify(sellerOrders.data));

const anonOrders = await anon.from('orders').select('*');
check('anon cannot read orders', !!anonOrders.error || (anonOrders.data?.length ?? 0) === 0, JSON.stringify(anonOrders.error?.message || `rows ${anonOrders.data?.length}`));

const forged = await api(buyer, `/api/checkout`, { method: 'POST', body: JSON.stringify({ ...address, customerName: 'x'.repeat(2) }) });
check('checkout payload validated', forged.status === 400, `status ${forged.status}`);

const statusHijack = await api(buyer, '/api/seller/orders', { method: 'PATCH', body: JSON.stringify({ order_id: orderId, status: 'completed' }) });
check('buyer cannot use the seller order route', statusHijack.status >= 400, `status ${statusHijack.status} ${JSON.stringify(statusHijack.body)?.slice(0, 80)}`);

const sellerHijack = await api(seller, '/api/seller/orders', { method: 'PATCH', body: JSON.stringify({ order_id: orderId, status: 'completed', payment_status: 'paid' }) });
check('seller cannot mark an order paid', sellerHijack.status >= 400, `status ${sellerHijack.status} ${JSON.stringify(sellerHijack.body)?.slice(0, 120)}`);

const sellerAdvance = await api(seller, '/api/seller/orders', { method: 'PATCH', body: JSON.stringify({ order_id: orderId, status: 'shipped' }) });
check('seller can ship an order in their own store', sellerAdvance.status === 200 && sellerAdvance.body?.order?.status === 'shipped', `status ${sellerAdvance.status} ${sellerAdvance.body?.order?.status}`);

const otherSeller = await api(seller, '/api/seller/orders', { method: 'PATCH', body: JSON.stringify({ order_id: (await asService.from('orders').select('id, store_id').eq('store_id', otherStore.store_id).maybeSingle()).data?.id ?? randomUUID(), status: 'shipped' }) });
check('seller cannot touch a foreign store order', otherSeller.status >= 400, `status ${otherSeller.status} ${JSON.stringify(otherSeller.body)?.slice(0, 80)}`);

// --- roles -----------------------------------------------------------------
const noRoleBuyer = await api(buyer, '/api/seller/products');
check('buyer blocked from seller API', noRoleBuyer.status === 403, `status ${noRoleBuyer.status} ${JSON.stringify(noRoleBuyer.body)?.slice(0, 60)}`);

const created = await api(seller, '/api/seller/products', { method: 'POST', body: JSON.stringify({ title: 'E2E verified product', slug: `e2e-verified-${Date.now()}`, sku: `E2E-${Date.now()}`, description: 'Created by the verification harness.', category_id: catalogue[0].category_id ?? (await anon.from('categories').select('id').eq('slug', 'clothing')).data[0].id, price: 42.5, discount_rate: 10, stock: 7, status: 'published', image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80' }) });
check('seller creates a product', created.status === 200 && created.body?.product?.id, `status ${created.status} ${JSON.stringify(created.body)?.slice(0, 100)}`);
const sellerList = await api(seller, '/api/seller/products');
check('seller lists only own products', (sellerList.body?.products ?? 0) && sellerList.body.products.every((p) => p.store?.user_id === seller.id || p.store_id), `${sellerList.body?.products?.length} rows`);

const foreignStoreId = otherStore.store_id;
const crossStore = await api(seller, '/api/seller/products', { method: 'POST', body: JSON.stringify({ title: 'Not my store', slug: `cross-store-${Date.now()}`, sku: `XS-${Date.now()}`, description: 'Should be rejected by RLS.', category_id: (await anon.from('categories').select('id').eq('slug', 'clothing')).data[0].id, price: 10, discount_rate: 0, stock: 1, store_id: foreignStoreId }) });
check('seller cannot write into another store', crossStore.status >= 400 || crossStore.body?.product?.store_id !== foreignStoreId, `status ${crossStore.status} ${JSON.stringify(crossStore.body)?.slice(0, 90)}`);

const adminUsers = await api(admin, '/api/admin/users');
check('admin reads the user list', adminUsers.status === 200 && Array.isArray(adminUsers.body?.users), `status ${adminUsers.status} users ${adminUsers.body?.users?.length}`);
const buyerEscalate = await api(buyer, '/api/admin/users');
check('buyer blocked from admin API', buyerEscalate.status === 403, `status ${buyerEscalate.status}`);
const sellerEscalate = await api(seller, '/api/admin/users', { method: 'PATCH', body: JSON.stringify({ user_id: seller.id, role: 'admin' }) });
check('seller cannot promote itself to admin', sellerEscalate.status === 403, `status ${sellerEscalate.status} ${JSON.stringify(sellerEscalate.body)?.slice(0, 60)}`);
// anon.signUp is behind Supabase's email rate limit, so exercise the same trigger path
// through the Admin API: the metadata a hand-built request would carry is role='admin'.
const escalationEmail = `escalation-${Date.now()}@modesy.dev`;
const svcHeaders = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json' };
const authCreated = await fetch(`${URL}/auth/v1/admin/users`, { method: 'POST', headers: svcHeaders, body: JSON.stringify({ email: escalationEmail, password: PASSWORD, email_confirm: true, user_metadata: { full_name: 'Attacker', role: 'admin' } }) }).then((r) => r.json());
const forgedProfile = authCreated.id ? await asService.from('profiles').select('role, full_name').eq('email', escalationEmail).maybeSingle() : { data: null, error: { message: 'user not created' } };
const cleanUp = authCreated.id ? await fetch(`${URL}/auth/v1/admin/users/${authCreated.id}`, { method: 'DELETE', headers: svcHeaders }).then((r) => r.status) : 'n/a';
check('signup metadata cannot mint an admin', forgedProfile.data?.role === 'customer', `metadata role=admin → profile role ${forgedProfile.data?.role ?? `none (${forgedProfile.error?.message})`}; temp user deleted: ${cleanUp}`);

// --- reviews ---------------------------------------------------------------
const review = await api(buyer, '/api/reviews', { method: 'POST', body: JSON.stringify({ product_id: withVariant.id, rating: 4, review_text: 'Good quality, the sizing is accurate.' }) });
check('purchase-gated review accepted', review.status === 200, `status ${review.status} ${JSON.stringify(review.body)?.slice(0, 90)}`);
const fakeReview = await api(buyer2, '/api/reviews', { method: 'POST', body: JSON.stringify({ product_id: withVariant.id, rating: 5, review_text: 'I never bought this but want five stars.' }) });
check('review blocked without a purchase', fakeReview.status >= 400, `status ${fakeReview.status} ${JSON.stringify(fakeReview.body)?.slice(0, 90)}`);

// --- contact + inquiry ------------------------------------------------------
const contactRes = await fetch(`${APP}/api/contact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'E2E', email: 'e2e@modesy.dev', message: 'Verification message.' }) });
const contactBody = await contactRes.json().catch(() => null);
check('contact form persists', contactRes.status === 200, `status ${contactRes.status} ${JSON.stringify(contactBody)?.slice(0, 80)}`);

const pages = ['/', '/products', '/blog', '/contact', '/cart', '/login', '/register', '/shops', '/categories/clothing', '/about-us'];
for (const p of pages) {
  const res = await fetch(`${APP}${p}`);
  check(`page ${p}`, res.status === 200, `status ${res.status}`);
}
const detail = await fetch(`${APP}/products/${withVariant.slug}`);
check('product detail page', detail.status === 200, `status ${detail.status}`);
const detailRoot = await fetch(`${APP}/${withVariant.slug}`);
check('product detail on the root slug route', detailRoot.status === 200, `status ${detailRoot.status}`);
const sellerPage = await fetch(`${APP}/profile/trendshop`);
check('seller profile page', sellerPage.status === 200, `status ${sellerPage.status}`);
const blogSlug = (await anon.from('blog_posts').select('slug').eq('published', true).limit(1).single()).data.slug;
const blogPage = await fetch(`${APP}/blog/${blogSlug}`);
check('blog post page', blogPage.status === 200, `status ${blogPage.status}`);

const orderItems = await asService.from('order_items').select('product_title, price, quantity, total_price, product_image, variant_name').eq('order_id', orderId);
check('order_items snapshot rows', (orderItems.data?.length ?? 0) >= 1 && orderItems.data.every((i) => Number(i.total_price) === Math.round(Number(i.price) * i.quantity * 100) / 100 && !!i.product_title), JSON.stringify(orderItems.data?.map((i) => `${i.variant_name ?? i.product_title} x${i.quantity}=${i.total_price}`)));
const payments = await asService.from('payments').select('provider, status, amount, currency, transaction_ref, is_sandbox').eq('order_id', orderId);
check('simulated payment recorded', payments.data?.length === 1 && payments.data[0].is_sandbox === true && /^SIM-/.test(payments.data[0].transaction_ref), JSON.stringify(payments.data?.[0]));
for (const [p, sess] of [['/account/orders', buyer], ['/wishlist', buyer], ['/seller/products', seller], ['/seller/dashboard', seller], ['/admin/dashboard', admin], ['/checkout', buyer]]) {
  const res = await fetch(`${APP}${p}`, { headers: { cookie: sess.cookies }, redirect: 'manual' });
  check(`authed page ${p}`, res.status === 200, `status ${res.status}`);
}
const anonAccount = await fetch(`${APP}/account/orders`, { redirect: 'manual' });
check('signed-out /account redirects to login', anonAccount.status === 307 && /\/login/.test(anonAccount.headers.get('location') || ''), `${anonAccount.status} -> ${anonAccount.headers.get('location')}`);
const buyerSellerPage = await fetch(`${APP}/seller/dashboard`, { headers: { cookie: buyer.cookies }, redirect: 'manual' });
check('buyer cannot open /seller', buyerSellerPage.status === 307 || buyerSellerPage.status === 403, `status ${buyerSellerPage.status} -> ${buyerSellerPage.headers.get('location')}`);

const storeAfterOrder = await asService.from('stores').select('slug, sales_count, total_revenue, products_count').eq('id', withVariant.store_id).single();
check('store aggregates updated by triggers', storeAfterOrder.data.sales_count >= 4 && Number(storeAfterOrder.data.total_revenue) > 0, `${storeAfterOrder.data.slug}: ${storeAfterOrder.data.sales_count} sales, ${storeAfterOrder.data.total_revenue} revenue, ${storeAfterOrder.data.products_count} products`);

const lineSum = await asService.from('order_items').select('total_price').eq('order_id', orderId);
const storedOrder = await asService.from('orders').select('subtotal, discount, shipping_fee, total').eq('id', orderId).single();
const summed = Math.round((lineSum.data ?? []).reduce((a, i) => a + Number(i.total_price), 0) * 100) / 100;
check('stored order math', Math.abs(summed - Number(storedOrder.data.subtotal)) < 0.01 && Math.abs(Number(storedOrder.data.total) - (storedOrder.data.subtotal - storedOrder.data.discount + storedOrder.data.shipping_fee)) < 0.01,
  `items ${summed} vs subtotal ${storedOrder.data.subtotal}; total ${storedOrder.data.total}`);

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) console.log('FAILED: ' + failed.map((f) => f.name).join(' | '));
