// Verification harness for the live database. Run: npm run test:db
// Requires a dev server on :3000 and the four demo logins from supabase/seed-demo-users.sh.
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
// The demo logins are disposable, but the password still must not live in a committed file.
const PASSWORD = env.E2E_DEMO_PASSWORD;
if (!PASSWORD) {
  console.error('E2E_DEMO_PASSWORD is not set in .env.local. Add it there; never commit it.');
  process.exit(1);
}

// Orders left over from earlier runs of this harness are still in the database, so every
// "this action created nothing" assertion is scoped to rows produced after the run started.
const runStart = new Date().toISOString();

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}
// A skipped check is never counted as a pass: the app has no silent fallbacks and neither does this harness.
function skip(name, detail) {
  results.push({ name, pass: null, detail });
  console.log(`SKIP  ${name} — ${detail}`);
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
const svcProbe = await asService.from('products').select('id').limit(1);
const SERVICE_OK = !svcProbe.error;
if (!SERVICE_OK) console.log(`\n!!  SUPABASE_SERVICE_ROLE_KEY is rejected by the project: ${svcProbe.error.message}\n!!  Every direct-database check below is reported as SKIP, never as PASS.\n`);
const { data: catalogue } = await anon.from('products')
  .select('id, slug, title, sku, price, discounted_price, stock, status, store_id, category_id, product_variants(id, name, stock, price, discounted_price)')
  .eq('status', 'published').order('slug').limit(20);
if (!catalogue) throw new Error(`anon key cannot read products: ${(await anon.from('products').select('id').limit(1)).error?.message}`);

const withVariant = catalogue.find((p) => p.product_variants?.length);
const plain = catalogue.find((p) => !p.product_variants?.length);
const otherStore = catalogue.find((p) => p.store_id !== withVariant.store_id);
console.log(`catalogue: ${catalogue.length} published, ${catalogue.filter((p) => p.product_variants?.length).length} with variants`);

const buyer = await session('buyer@modesy.dev');
const buyer2 = await session('buyer2@modesy.dev');
const seller = await session('seller@modesy.dev');
const admin = await session('admin@modesy.dev');
check('signup/login', buyer.id && seller.id && admin.id, '4 accounts signed in');

// These accounts are shared with the other harnesses; start from a known-empty cart
// so a leftover line cannot be mistaken for a bug in the empty-cart guard.
for (const s of [buyer, buyer2]) await api(s, '/api/cart', { method: 'POST', body: JSON.stringify({ action: 'clear' }) });

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

if (!SERVICE_OK) {
  skip('checkout rejects a line that sold out while it sat in the cart', 'needs a service-role write to force stock below the cart quantity');
  skip('rejected checkout leaves no order and rolls back the stock move', 'needs service-role reads');
} else {
  await api(buyer2, '/api/cart', { method: 'POST', body: JSON.stringify({ action: 'add', product_id: scarce.id, quantity: 3 }) });
  const soldOutUnderneath = await asService.from('products').update({ stock: 2 }).eq('id', scarce.id).select('stock').single();
  const raced = await api(buyer2, '/api/checkout', { method: 'POST', body: JSON.stringify({ customerName: 'Sam', customerEmail: 'buyer2@modesy.dev', customerPhone: '+1 6195550199', shippingAddress: { ...address, first_name: 'Sam', last_name: 'Rivera' }, paymentMethod: 'cod', idempotencyKey: randomUUID() }) });
  check('checkout rejects a line that sold out while it sat in the cart', raced.status >= 400 && /only 2 left/i.test(raced.body?.error || ''), `stock forced to ${soldOutUnderneath.data.stock} → ${raced.status} ${raced.body?.error}`);
  check('rejected checkout leaves no order and rolls back the stock move', (await asService.from('orders').select('id').eq('user_id', buyer2.id).gte('created_at', runStart)).data.length === 0 && (await asService.from('products').select('stock').eq('id', scarce.id).single()).data.stock === 2, `no buyer2 order rows after ${runStart}`);
  await asService.from('products').update({ stock: scarce.stock }).eq('id', scarce.id);
}
await api(buyer2, '/api/cart', { method: 'POST', body: JSON.stringify({ action: 'clear' }) });

// --- order visibility (RLS) ------------------------------------------------
if (SERVICE_OK) {
  const allOrders = await asService.from('orders').select('id, order_number, user_id, total, discount, payment_status, currency, exchange_rate');
  const persisted = orders ? orders.every((o) => allOrders.data.some((r) => r.order_number === o.order_number)) : false;
  check('every returned order exists in the database', persisted, `${allOrders.data.length} order row(s)`);
  check('cod order waits for payment', (await asService.from('orders').select('payment_status, status').eq('order_number', noCoupon.body.orders[0].order_number).single()).data.payment_status === 'pending', 'payment_status pending');
} else {
  skip('every returned order exists in the database', 'service-role read unavailable');
  skip('cod order waits for payment', 'service-role read unavailable');
}
const orderId = first?.id ?? orders?.[0]?.id;

const b2Orders = await createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${buyer2.token}` } } }).from('orders').select('*').eq('id', orderId);
check("buyer B cannot read buyer A's order", (b2Orders.data?.length ?? 1) === 0, JSON.stringify(b2Orders.error?.message || `rows ${b2Orders.data?.length}`));

const sellerOrders = await createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${seller.token}` } } }).from('orders').select('order_number, store_id').eq('id', orderId);
check('fulfilling seller reads the order', (sellerOrders.data?.length ?? 0) === 1, JSON.stringify(sellerOrders.data));

const anonOrders = await anon.from('orders').select('*');
check('anon cannot read orders', !!anonOrders.error || (anonOrders.data?.length ?? 0) === 0, JSON.stringify(anonOrders.error?.message || `rows ${anonOrders.data?.length}`));

// A1: /admin/orders links an invoice that lives in the customer account area, so
// both the admin read and the same URL held by another customer have to be real.
const adminInvoice = await fetch(`${APP}/account/orders/${first.order_number}`, { headers: { cookie: admin.cookies }, redirect: 'manual' });
const adminInvoiceHtml = await adminInvoice.text();
check("the admin invoice link shows another customer's order", adminInvoice.status === 200 && adminInvoiceHtml.includes(first.order_number), `status ${adminInvoice.status}`);
const strangerInvoice = await fetch(`${APP}/account/orders/${first.order_number}`, { headers: { cookie: buyer2.cookies }, redirect: 'manual' });
const strangerHtml = await strangerInvoice.text();
check('another customer cannot open that invoice', strangerInvoice.status === 404 || !strangerHtml.includes('Order Invoice'), `status ${strangerInvoice.status}`);

// A2: the checkout page splits "this coupon does not apply" from "the coupon service
// did not answer" by status code, so that split is part of the contract.
const unknownCoupon = await api(buyer, `/api/checkout/coupon?code=NOSUCHCODE&subtotal=${withVariant.price}`);
check('an unknown coupon is a rejection, not a server error', unknownCoupon.status === 200 && Number(unknownCoupon.body?.discount) === 0, `status ${unknownCoupon.status} ${JSON.stringify(unknownCoupon.body)?.slice(0, 80)}`);
const couponNoCode = await api(buyer, '/api/checkout/coupon?subtotal=10');
check('a coupon query without a code is a 400', couponNoCode.status === 400, `status ${couponNoCode.status}`);
const anonCoupon = await fetch(`${APP}/api/checkout/coupon?code=WELCOME&subtotal=100`);
check('anon cannot probe coupon codes', anonCoupon.status === 401, `status ${anonCoupon.status}`);

// A7: /products/<slug> used to render a second copy of the product page.
const legacyUrl = await fetch(`${APP}/products/${withVariant.slug}`, { redirect: 'manual' });
check('the legacy /products/<slug> URL redirects permanently', legacyUrl.status === 308 && (legacyUrl.headers.get('location') ?? '').endsWith(`/${withVariant.slug}`), `status ${legacyUrl.status} -> ${legacyUrl.headers.get('location')}`);

const forged = await api(buyer, `/api/checkout`, { method: 'POST', body: JSON.stringify({ ...address, customerName: 'x'.repeat(2) }) });
check('checkout payload validated', forged.status === 400, `status ${forged.status}`);

const statusHijack = await api(buyer, '/api/seller/orders', { method: 'PATCH', body: JSON.stringify({ order_id: orderId, status: 'completed' }) });
check('buyer cannot use the seller order route', statusHijack.status >= 400, `status ${statusHijack.status} ${JSON.stringify(statusHijack.body)?.slice(0, 80)}`);

const sellerHijack = await api(seller, '/api/seller/orders', { method: 'PATCH', body: JSON.stringify({ order_id: orderId, status: 'completed', payment_status: 'paid' }) });
check('seller cannot mark an order paid', sellerHijack.status >= 400, `status ${sellerHijack.status} ${JSON.stringify(sellerHijack.body)?.slice(0, 120)}`);

const sellerAdvance = await api(seller, '/api/seller/orders', { method: 'PATCH', body: JSON.stringify({ order_id: orderId, status: 'shipped' }) });
check('seller can ship an order in their own store', sellerAdvance.status === 200 && sellerAdvance.body?.order?.status === 'shipped', `status ${sellerAdvance.status} ${sellerAdvance.body?.order?.status}`);

// The cross-tenant write needs an order that belongs to a store this seller does not own.
// Rather than skip when the demo catalogue has none, place one through the real checkout
// flow; it is identifiable by its notes text.
let foreignOrder = SERVICE_OK
  ? (await asService.from('orders').select('id').eq('store_id', otherStore.store_id).gte('created_at', runStart).maybeSingle()).data?.id
  : undefined;
if (!foreignOrder && SERVICE_OK) {
  await api(buyer, '/api/cart', { method: 'POST', body: JSON.stringify({ action: 'clear' }) });
  await api(buyer, '/api/cart', { method: 'POST', body: JSON.stringify({ action: 'add', product_id: otherStore.id, quantity: 1 }) });
  const probe = await api(buyer, '/api/checkout', { method: 'POST', body: JSON.stringify({ customerName: 'Jane Doe', customerEmail: 'buyer@modesy.dev', customerPhone: '+1 6195550148', shippingAddress: address, paymentMethod: 'cod', notes: 'e2e harness cross-tenant probe', idempotencyKey: randomUUID() }) });
  foreignOrder = probe.body?.orders?.[0]?.id;
}
if (foreignOrder) {
  const otherSeller = await api(seller, '/api/seller/orders', { method: 'PATCH', body: JSON.stringify({ order_id: foreignOrder, status: 'shipped' }) });
  check('seller cannot touch a foreign store order', otherSeller.status >= 400, `status ${otherSeller.status} ${JSON.stringify(otherSeller.body)?.slice(0, 80)}`);
} else {
  skip('seller cannot touch a foreign store order', SERVICE_OK ? 'could not create an order in the other store' : 'service-role read unavailable');
}

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
if (!SERVICE_OK) {
  skip('signup metadata cannot mint an admin', 'needs the Auth Admin API (service-role key) to create the temp user');
} else {
  const escalationEmail = `escalation-${Date.now()}@modesy.dev`;
  const svcHeaders = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json' };
  const authCreated = await fetch(`${URL}/auth/v1/admin/users`, { method: 'POST', headers: svcHeaders, body: JSON.stringify({ email: escalationEmail, password: PASSWORD, email_confirm: true, user_metadata: { full_name: 'Attacker', role: 'admin' } }) }).then((r) => r.json());
  const forgedProfile = authCreated.id ? await asService.from('profiles').select('role, full_name').eq('email', escalationEmail).maybeSingle() : { data: null, error: { message: 'user not created' } };
  const cleanUp = authCreated.id ? await fetch(`${URL}/auth/v1/admin/users/${authCreated.id}`, { method: 'DELETE', headers: svcHeaders }).then((r) => r.status) : 'n/a';
  check('signup metadata cannot mint an admin', forgedProfile.data?.role === 'customer', `metadata role=admin → profile role ${forgedProfile.data?.role ?? `none (${forgedProfile.error?.message})`}; temp user deleted: ${cleanUp}`);
}

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

if (!SERVICE_OK) {
  skip('order_items snapshot rows', 'service-role read unavailable');
  skip('simulated payment recorded', 'service-role read unavailable');
} else {
  const orderItems = await asService.from('order_items').select('product_title, price, quantity, total_price, product_image, variant_name').eq('order_id', orderId);
  check('order_items snapshot rows', (orderItems.data?.length ?? 0) >= 1 && orderItems.data.every((i) => Number(i.total_price) === Math.round(Number(i.price) * i.quantity * 100) / 100 && !!i.product_title), JSON.stringify(orderItems.data?.map((i) => `${i.variant_name ?? i.product_title} x${i.quantity}=${i.total_price}`)));
  const payments = await asService.from('payments').select('provider, status, amount, currency, transaction_ref, is_sandbox').eq('order_id', orderId);
  check('simulated payment recorded', payments.data?.length === 1 && payments.data[0].is_sandbox === true && /^SIM-/.test(payments.data[0].transaction_ref), JSON.stringify(payments.data?.[0]));
}
for (const [p, sess] of [['/account/orders', buyer], ['/wishlist', buyer], ['/seller/products', seller], ['/seller/dashboard', seller], ['/admin/dashboard', admin], ['/checkout', buyer]]) {
  const res = await fetch(`${APP}${p}`, { headers: { cookie: sess.cookies }, redirect: 'manual' });
  check(`authed page ${p}`, res.status === 200, `status ${res.status}`);
}
const anonAccount = await fetch(`${APP}/account/orders`, { redirect: 'manual' });
check('signed-out /account redirects to login', anonAccount.status === 307 && /\/login/.test(anonAccount.headers.get('location') || ''), `${anonAccount.status} -> ${anonAccount.headers.get('location')}`);
const buyerSellerPage = await fetch(`${APP}/seller/dashboard`, { headers: { cookie: buyer.cookies }, redirect: 'manual' });
check('buyer cannot open /seller', buyerSellerPage.status === 307 || buyerSellerPage.status === 403, `status ${buyerSellerPage.status} -> ${buyerSellerPage.headers.get('location')}`);

// These two only read aggregate columns that the public storefront already exposes,
// so they still run through RLS when the service-role key is unavailable.
const agg = SERVICE_OK ? asService : anon;
const storeAfterOrder = await agg.from('stores').select('slug, sales_count, total_revenue, products_count').eq('id', withVariant.store_id).single();
if (storeAfterOrder.error) skip('store aggregates updated by triggers', storeAfterOrder.error.message);
else check('store aggregates updated by triggers', storeAfterOrder.data.sales_count >= 4 && Number(storeAfterOrder.data.total_revenue) > 0, `${storeAfterOrder.data.slug}: ${storeAfterOrder.data.sales_count} sales, ${storeAfterOrder.data.total_revenue} revenue, ${storeAfterOrder.data.products_count} products`);

const lineSum = await agg.from('order_items').select('total_price').eq('order_id', orderId);
const storedOrder = await agg.from('orders').select('subtotal, discount, shipping_fee, total').eq('id', orderId).single();
if (lineSum.error || storedOrder.error) skip('stored order math', `${lineSum.error?.message ?? storedOrder.error?.message}`);
else {
  const summed = Math.round((lineSum.data ?? []).reduce((a, i) => a + Number(i.total_price), 0) * 100) / 100;
  check('stored order math', Math.abs(summed - Number(storedOrder.data.subtotal)) < 0.01 && Math.abs(Number(storedOrder.data.total) - (storedOrder.data.subtotal - storedOrder.data.discount + storedOrder.data.shipping_fee)) < 0.01,
    `items ${summed} vs subtotal ${storedOrder.data.subtotal}; total ${storedOrder.data.total}`);
}

// --- account: profile, address book, column privileges ----------------------
const profileGet = await api(buyer, '/api/account/profile');
check('profile route returns the signed-in row', profileGet.status === 200 && profileGet.body?.profile?.email === 'buyer@modesy.dev' && profileGet.body?.profile?.role === 'customer', `status ${profileGet.status} ${JSON.stringify(profileGet.body?.profile)?.slice(0, 90)}`);

const profilePut = await api(buyer, '/api/account/profile', { method: 'PUT', body: JSON.stringify({ full_name: 'Jane Doe', phone: '+1 619 555 0148', avatar_url: '' }) });
check('profile edit persists', profilePut.status === 200 && profilePut.body?.profile?.phone === '+1 619 555 0148', `status ${profilePut.status} ${JSON.stringify(profilePut.body)?.slice(0, 90)}`);
const profileAfter = await api(buyer, '/api/account/profile');
check('profile edit survives a reload', profileAfter.body?.profile?.phone === '+1 619 555 0148', JSON.stringify(profileAfter.body?.profile?.phone));

// The API strips unknown keys, so attack the REST endpoint the way a browser script would:
// with the user's own JWT and a role field. Column privileges (migration 022) must refuse it.
async function restPatch(sess, payload) {
  const res = await fetch(`${URL}/rest/v1/profiles?id=eq.${sess.id}`, {
    method: 'PATCH',
    headers: { apikey: ANON, Authorization: `Bearer ${sess.token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}
const escalate = await restPatch(buyer, { role: 'admin' });
const roleAfterAttack = await asService.from('profiles').select('role').eq('id', buyer.id).single();
check('a user cannot promote itself over REST', escalate.status >= 400 && roleAfterAttack.data?.role === 'customer', `PATCH ${escalate.status} ${JSON.stringify(escalate.body)?.slice(0, 70)}; role ${roleAfterAttack.data?.role}`);
const legitColumn = await restPatch(buyer, { full_name: 'Jane Doe' });
check('the writable profile columns still work', legitColumn.status < 400, `status ${legitColumn.status} ${JSON.stringify(legitColumn.body)?.slice(0, 70)}`);

const ADDR_A = { title: 'E2E harness A', first_name: 'Sam', last_name: 'Rivera', phone: '+1 6195550199', address_line1: '1 Harbor Drive', country: 'United States', state: 'California', city: 'San Diego', postal_code: '92101' };
const ADDR_B = { ...ADDR_A, title: 'E2E harness B', address_line1: '2 Bay Street', city: 'La Jolla', postal_code: '92037' };
const savedBefore = await api(buyer2, '/api/account/addresses');
check('address book loads', savedBefore.status === 200 && Array.isArray(savedBefore.body?.addresses), `${savedBefore.body?.addresses?.length} rows before`);

const firstSaved = await api(buyer2, '/api/account/addresses', { method: 'POST', body: JSON.stringify(ADDR_A) });
const secondSaved = await api(buyer2, '/api/account/addresses', { method: 'POST', body: JSON.stringify(ADDR_B) });
const firstId = firstSaved.body?.address?.id;
const secondId = secondSaved.body?.address?.id;
check('first saved address becomes the default', firstSaved.status === 200 && firstSaved.body?.address?.is_default === true, `status ${firstSaved.status} default ${firstSaved.body?.address?.is_default}`);
check('a later address does not steal the default', secondSaved.status === 200 && secondSaved.body?.address?.is_default === false, `status ${secondSaved.status} default ${secondSaved.body?.address?.is_default}`);

const badAddress = await api(buyer2, '/api/account/addresses', { method: 'POST', body: JSON.stringify({ ...ADDR_A, city: '' }) });
check('address validation rejects a missing city', badAddress.status === 400, `status ${badAddress.status} ${JSON.stringify(badAddress.body)?.slice(0, 70)}`);

const madeDefault = await api(buyer2, `/api/account/addresses/${secondId}`, { method: 'PATCH', body: JSON.stringify({ set_default: true }) });
const defaultRows = await api(buyer2, '/api/account/addresses');
const defaults = (defaultRows.body?.addresses ?? []).filter((a) => a.is_default);
check('switching the default moves it, never duplicates it', madeDefault.status === 200 && defaults.length === 1 && defaults[0].id === secondId, `${defaults.length} default row(s): ${defaults.map((d) => d.title).join(',')}`);

const edited = await api(buyer2, `/api/account/addresses/${firstId}`, { method: 'PATCH', body: JSON.stringify({ ...ADDR_A, city: 'Chula Vista' }) });
check('address edit persists', edited.status === 200 && edited.body?.address?.city === 'Chula Vista', `status ${edited.status} ${JSON.stringify(edited.body?.address?.city)}`);

const foreignEdit = await api(buyer, `/api/account/addresses/${firstId}`, { method: 'PATCH', body: JSON.stringify({ ...ADDR_A, city: 'Hacked' }) });
check("a user cannot edit another user's address", foreignEdit.status === 404, `status ${foreignEdit.status} ${JSON.stringify(foreignEdit.body)?.slice(0, 70)}`);
const foreignDelete = await api(buyer, `/api/account/addresses/${firstId}`, { method: 'DELETE' });
check("a user cannot delete another user's address", foreignDelete.status === 404, `status ${foreignDelete.status}`);

const deletedDefault = await api(buyer2, `/api/account/addresses/${secondId}`, { method: 'DELETE' });
const afterDelete = await api(buyer2, '/api/account/addresses');
const promoted = (afterDelete.body?.addresses ?? []).filter((a) => a.is_default);
check('deleting the default promotes the remaining address', deletedDefault.status === 200 && afterDelete.body?.addresses?.length === 1 && promoted.length === 1 && promoted[0].id === firstId, `rows ${afterDelete.body?.addresses?.length}, default ${promoted.map((p) => p.title).join(',')}`);
for (const a of afterDelete.body?.addresses ?? []) await api(buyer2, `/api/account/addresses/${a.id}`, { method: 'DELETE' });
const emptied = await api(buyer2, '/api/account/addresses');
check('harness addresses removed again', (emptied.body?.addresses ?? []).length === 0, `${emptied.body?.addresses?.length} left`);

// --- storage: a real byte-for-byte upload through the REST endpoint ---------
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==', 'base64');
async function storage(sess, method, bucket, path, opts = {}) {
  const res = await fetch(`${URL}/storage/v1/object/${bucket}/${path}`, {
    method,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${sess.token}`,
      'Content-Type': 'image/png',
      // Without this header a repeat POST is refused as a duplicate key, which would hide
      // whether the storage policy actually stopped the write.
      ...(opts.upsert ? { 'x-upsert': 'true' } : {}),
    },
    body: method === 'POST' ? (opts.size ? Buffer.alloc(opts.size, 7) : PNG) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}
const imagePath = `${seller.id}/e2e-${randomUUID()}.png`;
const uploaded = await storage(seller, 'POST', 'products', imagePath);
const servedImage = await fetch(`${URL}/storage/v1/object/public/products/${imagePath}`);
const servedBytes = Buffer.from(await servedImage.arrayBuffer());
check('seller uploads a real image to Storage', uploaded.status < 400 && servedImage.status === 200 && servedBytes.equals(PNG), `upload ${uploaded.status} ${JSON.stringify(uploaded.body)?.slice(0, 70)}; GET ${servedImage.status}`);

const buyerUpload = await storage(buyer, 'POST', 'products', `${buyer.id}/e2e-${randomUUID()}.png`);
check('a buyer is refused by the products bucket policy', buyerUpload.status >= 400, `status ${buyerUpload.status} ${JSON.stringify(buyerUpload.body)?.slice(0, 80)}`);

// The same visitor may write inside its own avatar folder, which is what the profile photo does.
const avatarPath = `${buyer.id}/e2e-${randomUUID()}.png`;
const avatarUpload = await storage(buyer, 'POST', 'avatars', avatarPath);
const avatarServed = await fetch(`${URL}/storage/v1/object/public/avatars/${avatarPath}`);
check('a buyer can store its own avatar', avatarUpload.status < 400 && avatarServed.status === 200, `upload ${avatarUpload.status}; GET ${avatarServed.status}`);
if (avatarUpload.status < 400) await storage(buyer, 'DELETE', 'avatars', avatarPath);

const replaceAttempt = await storage(buyer, 'POST', 'products', imagePath, { upsert: true });
check('a buyer cannot overwrite a seller object', replaceAttempt.status >= 400 && /row-level security/i.test(JSON.stringify(replaceAttempt.body)), `status ${replaceAttempt.status} ${JSON.stringify(replaceAttempt.body)?.slice(0, 60)}`);

const oversize = await storage(seller, 'POST', 'products', `${seller.id}/e2e-oversize-${randomUUID()}.png`, { size: 11 * 1024 * 1024 });
check('the bucket size limit is enforced by Storage', oversize.status >= 400, `status ${oversize.status} ${JSON.stringify(oversize.body)?.slice(0, 70)}`);

if (uploaded.status < 400) {
  // Public and raw object URLs are served from a CDN that keeps deleted files alive, so existence
  // is read from /object/info, which answers from the database.
  async function objectExists(sess, path) {
    const res = await fetch(`${URL}/storage/v1/object/info/products/${path}`, {
      headers: { apikey: ANON, Authorization: `Bearer ${sess.token}` },
    });
    return res.status < 400;
  }

  const crossDelete = await storage(buyer, 'DELETE', 'products', imagePath);
  check("a buyer cannot delete a seller's file", crossDelete.status >= 400 && (await objectExists(seller, imagePath)), `DELETE ${crossDelete.status}; object still present`);

  const removed = await storage(seller, 'DELETE', 'products', imagePath);
  check('the owner can delete its own file', removed.status < 400 && !(await objectExists(seller, imagePath)), `DELETE ${removed.status}; object ${await objectExists(seller, imagePath) ? 'present' : 'gone'}`);
}

// An admin role change goes through the service client, which was previously rejected.
if (!SERVICE_OK) {
  skip('admin can change a user role and revert it', 'service-role write unavailable');
} else {
  const promoted2 = await api(admin, '/api/admin/users', { method: 'PATCH', body: JSON.stringify({ user_id: buyer2.id, role: 'seller' }) });
  const roleNow = await asService.from('profiles').select('role').eq('id', buyer2.id).single();
  const reverted = await api(admin, '/api/admin/users', { method: 'PATCH', body: JSON.stringify({ user_id: buyer2.id, role: 'customer' }) });
  const roleBack = await asService.from('profiles').select('role').eq('id', buyer2.id).single();
  check('admin can change a user role and revert it', promoted2.status === 200 && roleNow.data?.role === 'seller' && reverted.status === 200 && roleBack.data?.role === 'customer', `→ ${roleNow.data?.role}, back to ${roleBack.data?.role}`);
}

// --- admin blog CMS ---------------------------------------------------------
// Blog articles used to exist only as seed rows: the storefront rendered them, but nobody
// could write one. These checks drive the real admin routes and read the rows back.
const stamp = Date.now();
const categorySlug = `e2e-harness-${stamp}`;
const postSlug = `e2e-harness-post-${stamp}`;
const postBody = 'Written by the verification harness so the save, publish and cascade paths are exercised against real rows.';

const adminCats = await api(admin, '/api/admin/blog/categories');
check('admin lists blog categories', adminCats.status === 200 && Array.isArray(adminCats.body?.categories), `${adminCats.body?.categories?.length ?? 0} categories`);
const buyerCats = await api(buyer, '/api/admin/blog/categories');
check('a customer cannot read the admin blog categories', buyerCats.status === 403, `status ${buyerCats.status}`);
const buyerCatCreate = await api(buyer, '/api/admin/blog/categories', { method: 'POST', body: JSON.stringify({ name: `Not Allowed ${stamp}` }) });
check('a customer cannot create a blog category', buyerCatCreate.status === 403, `status ${buyerCatCreate.status}`);

const newCat = await api(admin, '/api/admin/blog/categories', { method: 'POST', body: JSON.stringify({ name: `E2e Harness ${stamp}` }) });
const categoryId = newCat.body?.category?.id;
const storedCat = await anon.from('blog_categories').select('id, name, slug').eq('slug', categorySlug).maybeSingle();
check('admin creates a blog category', newCat.status === 200 && !!categoryId && storedCat.data?.id === categoryId, `POST ${newCat.status}; db row ${storedCat.data?.slug ?? 'missing'}`);
const clashCat = await api(admin, '/api/admin/blog/categories', { method: 'POST', body: JSON.stringify({ name: `E2e Harness ${stamp}` }) });
check('a duplicate category name is refused', clashCat.status === 409, `status ${clashCat.status}: ${clashCat.body?.error}`);

const draft = await api(admin, '/api/admin/blog', {
  method: 'POST',
  body: JSON.stringify({ title: `E2e Harness Post ${stamp}`, slug: postSlug, content: postBody, excerpt: 'Harness excerpt', published: false, category_id: categoryId }),
});
const postId = draft.body?.post?.id;
const hiddenFromAnon = await anon.from('blog_posts').select('id').eq('slug', postSlug).maybeSingle();
const inAdminList = (await api(admin, '/api/admin/blog')).body?.posts?.find((p) => p.slug === postSlug);
check('admin saves a draft that the storefront cannot see', draft.status === 200 && !!postId && hiddenFromAnon.data === null && inAdminList?.published === false, `POST ${draft.status}; anon row ${hiddenFromAnon.data ? 'visible' : 'hidden'}; admin list ${inAdminList ? 'has it' : 'misses it'}`);

const draftPage = await fetch(`${APP}/blog/${postSlug}`, { redirect: 'manual' });
check('a draft post has no public page', draftPage.status === 404, `status ${draftPage.status}`);

const sellerPost = await api(seller, '/api/admin/blog', {
  method: 'POST',
  body: JSON.stringify({ title: 'Seller Should Fail', slug: `seller-post-${stamp}`, content: postBody, published: true, category_id: categoryId }),
});
check('a seller cannot write a blog post', sellerPost.status === 403, `status ${sellerPost.status}`);
const shortPost = await api(admin, '/api/admin/blog', {
  method: 'POST',
  body: JSON.stringify({ title: 'Too Short', slug: `too-short-${stamp}`, content: 'nope', published: true, category_id: categoryId }),
});
check('a post with no real content is refused', shortPost.status === 400, `status ${shortPost.status}: ${shortPost.body?.error}`);
const clashPost = await api(admin, '/api/admin/blog', {
  method: 'POST',
  body: JSON.stringify({ title: `Clash ${stamp}`, slug: postSlug, content: postBody, published: true, category_id: categoryId }),
});
check('a duplicate post slug is refused', clashPost.status === 409, `status ${clashPost.status}: ${clashPost.body?.error}`);

const publish = await api(admin, '/api/admin/blog', {
  method: 'POST',
  body: JSON.stringify({ id: postId, title: `E2e Harness Post ${stamp}`, slug: postSlug, content: postBody, excerpt: 'Harness excerpt', published: true, category_id: categoryId }),
});
const publicRow = await anon.from('blog_posts').select('title, content, published, category_id').eq('slug', postSlug).maybeSingle();
check('publishing the post persists it', publish.status === 200 && publicRow.data?.published === true && publicRow.data?.content === postBody && publicRow.data?.category_id === categoryId, `POST ${publish.status}; db published=${publicRow.data?.published ?? 'null'}`);
const livePage = await fetch(`${APP}/blog/${postSlug}`);
const liveHtml = await livePage.text();
check('the published post renders on its page', livePage.status === 200 && liveHtml.includes(`E2e Harness Post ${stamp}`), `status ${livePage.status}`);
const blogIndex = await fetch(`${APP}/blog`);
const blogIndexHtml = await blogIndex.text();
check('the published post appears in the blog list', blogIndex.status === 200 && blogIndexHtml.includes(postSlug), `status ${blogIndex.status}`);

const postDelete = await api(admin, `/api/admin/blog?id=${postId}`, { method: 'DELETE' });
const afterPostDelete = await anon.from('blog_posts').select('id').eq('slug', postSlug).maybeSingle();
check('admin deletes a post', postDelete.status === 200 && afterPostDelete.data === null, `DELETE ${postDelete.status}; row ${afterPostDelete.data ? 'still there' : 'gone'}`);
const ghostPost = await api(admin, `/api/admin/blog?id=${postId}`, { method: 'DELETE' });
check('deleting a post twice reports 404', ghostPost.status === 404, `status ${ghostPost.status}`);

const republished = await api(admin, '/api/admin/blog', {
  method: 'POST',
  body: JSON.stringify({ title: `E2e Harness Post ${stamp}`, slug: postSlug, content: postBody, published: true, category_id: categoryId }),
});
const catDelete = await api(admin, `/api/admin/blog/categories?id=${categoryId}`, { method: 'DELETE' });const postAfterCascade = await anon.from('blog_posts').select('id').eq('slug', postSlug).maybeSingle();
const catAfterDelete = await anon.from('blog_categories').select('id').eq('slug', categorySlug).maybeSingle();
check('deleting a category deletes its posts with it', catDelete.status === 200 && postAfterCascade.data === null && catAfterDelete.data === null, `DELETE ${catDelete.status}; post ${postAfterCascade.data ? 'left' : 'gone'}, category ${catAfterDelete.data ? 'left' : 'gone'}`);
const ghostDelete = await api(admin, `/api/admin/blog/categories?id=${categoryId}`, { method: 'DELETE' });
check('deleting a category twice reports 404', ghostDelete.status === 404, `status ${ghostDelete.status}`);

// --- harness self-cleanup ---------------------------------------------------
// The seller write test needs a real INSERT, but a published listing left behind would grow
// the public catalogue on every run, so this run's own rows are pulled back to draft.
if (!SERVICE_OK) {
  skip('harness listings demoted after the tests', 'service-role write unavailable');
} else {
  const ids = [created.body?.product?.id, crossStore.body?.product?.id].filter(Boolean);
  for (const id of ids) await asService.from('products').update({ status: 'draft' }).eq('id', id);
  const stillPublished = await asService.from('products').select('id, slug').in('id', ids).eq('status', 'published');
  check('harness listings demoted after the tests', ids.length > 0 && (stillPublished.data?.length ?? 1) === 0, `${ids.length} created this run, ${stillPublished.data?.length ?? 0} still published`);
}

const failed = results.filter((r) => r.pass === false);
const skipped = results.filter((r) => r.pass === null);
const passed = results.length - failed.length - skipped.length;
console.log(`\n${passed}/${results.length - skipped.length} checks passed, ${failed.length} FAILED, ${skipped.length} SKIPPED (not verified)` + (skipped.length ? `: ${skipped.map((s) => s.name).join(' | ')}` : ''));
if (failed.length) console.log('FAILED: ' + failed.map((f) => f.name).join(' | '));
process.exit(failed.length ? 1 : 0);
