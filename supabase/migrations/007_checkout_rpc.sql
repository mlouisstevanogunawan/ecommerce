-- Migration 007: Checkout and order mutations as database functions
--
-- Why RPCs instead of letting the client INSERT into orders:
--   * Totals, unit prices and stock must be read from rows the client cannot change,
--     and read-and-write must happen in ONE transaction or two parallel checkouts can
--     oversell the same stock. supabase-js has no transactions, so the work lives here.
--   * Ownership (user_id) comes from auth.uid() inside a SECURITY DEFINER body, so a
--     forged request body cannot place an order on someone else account.
--   * The client sends intent (which coupon, which address) and never sends money.
--
-- Requires migration 006 (is_admin(), my_store_ids(), no direct INSERT policy on orders).
-- Safe to re-run.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_per_user
  ON public.orders (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND user_id IS NOT NULL;

COMMENT ON COLUMN public.orders.idempotency_key IS
  'Client-generated key per checkout attempt. A repeat call with the same key returns the order it already created instead of placing a second one.';

-- Payment method was free text and accepted anything. Closed set now.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_t') THEN
    CREATE TYPE public.payment_method_t AS ENUM (
      'credit_card', 'paypal', 'bank_transfer', 'cod');
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'orders'
       AND column_name = 'payment_method'
       AND data_type = 'text'
  ) THEN
    ALTER TABLE public.orders
      ALTER COLUMN payment_method TYPE public.payment_method_t
      USING (payment_method::public.payment_method_t);
  END IF;
END $$;

-- Simulated sandbox payment ledger, kept separate from orders so a real gateway can
-- replace the row contents without changing the order schema.
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status public.payment_status NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  exchange_rate NUMERIC(14, 6) NOT NULL DEFAULT 1,
  transaction_ref TEXT,
  is_sandbox BOOLEAN NOT NULL DEFAULT TRUE,
  raw JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments (order_id);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_select_via_order ON public.payments;
CREATE POLICY payments_select_via_order ON public.payments
  FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM public.orders o
       WHERE o.user_id = auth.uid()
          OR o.store_id IN (SELECT public.my_store_ids())
          OR public.is_admin()));
COMMENT ON POLICY payments_select_via_order ON public.payments IS
  'Readable by the buyer, the fulfilling seller and admins. There is no INSERT or UPDATE policy: only place_order() and update_order_status() write here.';

ALTER TABLE public.payments OWNER TO postgres;
REVOKE ALL ON public.payments FROM PUBLIC;
GRANT SELECT ON public.payments TO anon, authenticated;
GRANT ALL ON public.payments TO service_role;

-- ---------------------------------------------------------------------------
-- Cart helpers. Each derives the cart from auth.uid(); none accepts a cart id,
-- so a caller can never operate on somebody else cart.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_cart_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign-in required to use a saved cart' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_id FROM public.carts WHERE user_id = v_uid;
  IF v_id IS NULL THEN
    INSERT INTO public.carts (user_id) VALUES (v_uid) RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cart_add_item(
  p_product_id UUID,
  p_quantity INT DEFAULT 1,
  p_variant_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cart UUID := public.my_cart_id();
  v_product public.products%ROWTYPE;
  v_variant public.product_variants%ROWTYPE;
  v_item_id UUID;
  v_existing_qty INT := 0;
  v_available INT;
  v_wanted INT;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RAISE EXCEPTION 'Quantity must be at least 1';
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_product.status <> 'published' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Product is no longer available' USING ERRCODE = 'P0002';
  END IF;

  SELECT id, quantity INTO v_item_id, v_existing_qty FROM public.cart_items
   WHERE cart_id = v_cart AND product_id = p_product_id
     AND COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::UUID)
       = COALESCE(p_variant_id, '00000000-0000-0000-0000-000000000000'::UUID);

  -- SELECT ... INTO with no match nulls every target, so restore the 0 explicitly
  -- before doing arithmetic on it.
  v_existing_qty := COALESCE(v_existing_qty, 0);

  -- Stock is checked against the resulting line total, not just this request, or
  -- adding 1 three times to a line with 2 left would pass every time.
  v_wanted := v_existing_qty + p_quantity;

  IF p_variant_id IS NOT NULL THEN
    SELECT * INTO v_variant FROM public.product_variants
     WHERE id = p_variant_id AND product_id = p_product_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'That option does not belong to this product';
    END IF;
    v_available := v_variant.stock;
  ELSE
    v_available := v_product.stock;
  END IF;

  IF v_available < v_wanted THEN
    IF v_existing_qty > 0 THEN
      RAISE EXCEPTION 'You already have % of this item; only % available',
        v_existing_qty, v_available;
    END IF;
    RAISE EXCEPTION 'Only % left in stock', v_available;
  END IF;

  IF v_item_id IS NOT NULL THEN
    UPDATE public.cart_items SET quantity = v_wanted WHERE id = v_item_id;
  ELSE
    INSERT INTO public.cart_items (cart_id, product_id, variant_id, quantity)
    VALUES (v_cart, p_product_id, p_variant_id, p_quantity)
    RETURNING id INTO v_item_id;
  END IF;

  RETURN v_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cart_set_quantity(p_item_id UUID, p_quantity INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cart UUID := public.my_cart_id();
  v_item public.cart_items%ROWTYPE;
  v_available INT;
BEGIN
  SELECT * INTO v_item FROM public.cart_items
   WHERE id = p_item_id AND cart_id = v_cart;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cart item not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_quantity <= 0 THEN
    DELETE FROM public.cart_items WHERE id = p_item_id;
    RETURN;
  END IF;

  IF v_item.variant_id IS NOT NULL THEN
    SELECT stock INTO v_available FROM public.product_variants WHERE id = v_item.variant_id;
  ELSE
    SELECT stock INTO v_available FROM public.products WHERE id = v_item.product_id;
  END IF;

  IF v_available IS NULL OR v_available < p_quantity THEN
    RAISE EXCEPTION 'Only % available', COALESCE(v_available, 0);
  END IF;

  UPDATE public.cart_items SET quantity = p_quantity WHERE id = p_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cart_remove_item(p_item_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.cart_items
   WHERE id = p_item_id
     AND cart_id = (SELECT id FROM public.carts WHERE user_id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.cart_clear()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.cart_items
   WHERE cart_id IN (SELECT id FROM public.carts WHERE user_id = auth.uid());
END;
$$;

-- ---------------------------------------------------------------------------
-- Pricing rules live in one place so the server and the UI cannot drift apart.
-- The client used to hardcode 150 / 15 / MODESY10 / WELCOME20 in three files.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.checkout_rules()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'base_currency', 'USD',
    'free_shipping_threshold', 150,
    'flat_shipping_fee', 15);
$$;

CREATE OR REPLACE FUNCTION public.coupon_discount(p_code TEXT, p_subtotal NUMERIC)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  -- 0 for an unknown, expired, disabled or below-minimum code, so an invalid coupon
  -- can never inflate a discount.
  SELECT COALESCE(
    CASE
      WHEN c.discount_percent IS NOT NULL
        THEN round(p_subtotal * c.discount_percent / 100, 2)
      ELSE round(LEAST(c.discount_amount, p_subtotal), 2)
    END, 0)
    FROM public.coupons c
   WHERE c.is_active
     AND upper(btrim(c.code)) = upper(btrim(p_code))
     AND (c.expires_at IS NULL OR c.expires_at > NOW())
     AND p_subtotal >= COALESCE(c.min_order_amount, 0);
$$;

-- ---------------------------------------------------------------------------
-- place_order: the only way an order row can exist.
--
-- Reads the buyer own cart from the database (never a client-supplied item list),
-- locks each product row, prices everything from the stored numbers, splits into one
-- order per vendor store, decrements stock, records the simulated payment, clears the
-- cart, and replays the idempotency key on a double submit.
-- Returns every order created by this call.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.place_order(
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_shipping_address JSONB,
  p_payment_method TEXT,
  p_coupon_code TEXT DEFAULT NULL,
  p_display_currency TEXT DEFAULT 'USD',
  p_exchange_rate NUMERIC DEFAULT 1,
  p_notes TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_cart UUID;
  v_rules JSONB := public.checkout_rules();
  v_payment_method public.payment_method_t;
  v_payment public.payment_status;
  v_status public.order_status;
  v_store_id UUID;
  v_order_id UUID;
  v_order_number TEXT;
  v_same_key BOOLEAN := FALSE;
  v_number_free BOOLEAN;
  v_created UUID[] := '{}'::UUID[];
  v_lines JSONB;
  v_line JSONB;
  v_product public.products%ROWTYPE;
  v_variant public.product_variants%ROWTYPE;
  v_unit NUMERIC(12, 2);
  v_subtotal NUMERIC(12, 2);
  v_discount NUMERIC(12, 2);
  v_shipping NUMERIC(12, 2);
  v_total NUMERIC(12, 2);
  v_collisions INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign-in is required to place an order' USING ERRCODE = '42501';
  END IF;
  IF p_customer_name IS NULL OR btrim(p_customer_name) = '' THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;
  IF p_customer_email IS NULL
     OR p_customer_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'A valid customer email address is required';
  END IF;
  IF p_shipping_address IS NULL OR jsonb_typeof(p_shipping_address) <> 'object'
     OR btrim(COALESCE(p_shipping_address ->> 'address_line1', '')) = '' THEN
    RAISE EXCEPTION 'A shipping address is required';
  END IF;

  BEGIN
    v_payment_method := p_payment_method::public.payment_method_t;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Unknown payment method "%"', COALESCE(p_payment_method, '');
  END;

  -- Replay protection: a second call carrying the key it already used gets that
  -- order back and creates nothing.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.orders o
       WHERE o.user_id = v_uid AND o.idempotency_key = p_idempotency_key
    ) INTO v_same_key;

    IF v_same_key THEN
      RETURN QUERY
        SELECT o.* FROM public.orders o
         WHERE o.user_id = v_uid AND o.idempotency_key = p_idempotency_key
         ORDER BY o.created_at;
      RETURN;
    END IF;
  END IF;

  SELECT id INTO v_cart FROM public.carts WHERE user_id = v_uid;
  IF v_cart IS NULL OR NOT EXISTS (
       SELECT 1 FROM public.cart_items ci
         JOIN public.products p ON p.id = ci.product_id
        WHERE ci.cart_id = v_cart) THEN
    RAISE EXCEPTION 'Shopping cart is empty';
  END IF;

  -- Sandbox simulation: a card is approved immediately, cash and wire await settlement.
  v_payment := CASE WHEN v_payment_method IN ('credit_card', 'paypal')
                    THEN 'paid'::public.payment_status
                    ELSE 'pending'::public.payment_status END;
  v_status := CASE WHEN v_payment = 'paid'
                   THEN 'processing'::public.order_status
                   ELSE 'pending'::public.order_status END;

  FOR v_store_id IN
    SELECT DISTINCT p.store_id
      FROM public.cart_items ci
      JOIN public.products p ON p.id = ci.product_id
     WHERE ci.cart_id = v_cart
  LOOP
    -- Pass 1: lock the rows and stage the priced lines. The cart rows are locked too
    -- so a concurrent checkout on the same account cannot double-spend the cart.
    v_lines := '[]'::JSONB;
    v_subtotal := 0;

    FOR v_line IN
      SELECT jsonb_build_object(
               'item_id', ci.id,
               'product_id', ci.product_id,
               'variant_id', ci.variant_id,
               'quantity', ci.quantity)
        FROM public.cart_items ci
        JOIN public.products p ON p.id = ci.product_id
       WHERE ci.cart_id = v_cart AND p.store_id = v_store_id
       ORDER BY ci.created_at
       FOR UPDATE OF ci
    LOOP
      SELECT * INTO v_product FROM public.products
       WHERE id = (v_line ->> 'product_id')::UUID
         FOR UPDATE;

      IF NOT FOUND OR v_product.status <> 'published' THEN
        RAISE EXCEPTION '"%" is no longer available', COALESCE(v_product.title, 'A product in your cart');
      END IF;

      v_unit := NULL;
      IF (v_line ->> 'variant_id') IS NOT NULL THEN
        SELECT * INTO v_variant FROM public.product_variants
         WHERE id = (v_line ->> 'variant_id')::UUID
           AND product_id = v_product.id
           FOR UPDATE;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'The selected option for "%" is no longer available', v_product.title;
        END IF;
        IF v_variant.stock < (v_line ->> 'quantity')::INT THEN
          RAISE EXCEPTION 'Only % left of the selected option for "%"', v_variant.stock, v_product.title;
        END IF;
        v_unit := COALESCE(NULLIF(v_variant.discounted_price, 0), v_variant.price);
      ELSE
        IF v_product.stock < (v_line ->> 'quantity')::INT THEN
          RAISE EXCEPTION 'Only % left of "%"', v_product.stock, v_product.title;
        END IF;
        v_unit := COALESCE(NULLIF(v_product.discounted_price, 0), v_product.price);
      END IF;

      v_unit := round(v_unit, 2);
      v_subtotal := v_subtotal + v_unit * (v_line ->> 'quantity')::INT;

      v_lines := v_lines || jsonb_build_array(jsonb_build_object(
        'item_id', (v_line ->> 'item_id')::UUID,
        'product_id', (v_line ->> 'product_id')::UUID,
        'variant_id', v_line ->> 'variant_id',
        'quantity', (v_line ->> 'quantity')::INT,
        'unit_price', v_unit,
        'title', v_product.title,
        'variant_name', CASE WHEN v_line ->> 'variant_id' IS NULL
                             THEN NULL ELSE v_variant.name END,
        'image', COALESCE((
          SELECT pi.image_url FROM public.product_images pi
           WHERE pi.product_id = v_product.id
           ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1), '')));
    END LOOP;

    IF jsonb_array_length(v_lines) = 0 THEN
      CONTINUE;
    END IF;

    v_discount := public.coupon_discount(p_coupon_code, v_subtotal);
    v_shipping := CASE
      WHEN v_subtotal >= (v_rules ->> 'free_shipping_threshold')::NUMERIC THEN 0
      ELSE (v_rules ->> 'flat_shipping_fee')::NUMERIC END;
    v_total := round(GREATEST(0, v_subtotal - v_discount + v_shipping), 2);

    -- Collision-safe, non-enumerable order number.
    v_collisions := 0;
    LOOP
      v_order_number := 'MDS-' || (100000 + floor(random() * 900000)::INT)::TEXT;
      SELECT NOT EXISTS (SELECT 1 FROM public.orders o
                          WHERE o.order_number = v_order_number) INTO v_number_free;
      EXIT WHEN v_number_free;
      v_collisions := v_collisions + 1;
      IF v_collisions > 20 THEN
        v_order_number := 'MDS-' || TO_CHAR(NOW(), 'YYMMDDHH24MISSMS');
        EXIT;
      END IF;
    END LOOP;

    INSERT INTO public.orders (
        order_number, user_id, store_id, customer_name, customer_email, customer_phone,
        shipping_address, subtotal, discount, shipping_fee, total, coupon_code,
        status, payment_method, payment_status, notes, currency, exchange_rate,
        paid_at, idempotency_key)
    VALUES (
        v_order_number, v_uid, v_store_id, btrim(p_customer_name),
        lower(btrim(p_customer_email)), btrim(p_customer_phone),
        p_shipping_address, round(v_subtotal, 2), v_discount, v_shipping, v_total,
        NULLIF(btrim(COALESCE(p_coupon_code, '')), ''),
        v_status, v_payment_method, v_payment, p_notes,
        COALESCE(NULLIF(p_display_currency, ''), 'USD'),
        COALESCE(NULLIF(p_exchange_rate, 0), 1),
        CASE WHEN v_payment = 'paid' THEN NOW() ELSE NULL END,
        NULLIF(btrim(COALESCE(p_idempotency_key, '')), ''))
    RETURNING id INTO v_order_id;

    v_created := array_append(v_created, v_order_id);

    FOR v_line IN SELECT * FROM jsonb_array_elements(v_lines) LOOP
      INSERT INTO public.order_items (
          order_id, product_id, variant_id, product_title, product_image,
          variant_name, price, quantity, total_price)
      VALUES (
          v_order_id,
          (v_line ->> 'product_id')::UUID,
          NULLIF(v_line ->> 'variant_id', '')::UUID,
          v_line ->> 'title',
          v_line ->> 'image',
          NULLIF(v_line ->> 'variant_name', ''),
          (v_line ->> 'unit_price')::NUMERIC,
          (v_line ->> 'quantity')::INT,
          round((v_line ->> 'unit_price')::NUMERIC * (v_line ->> 'quantity')::INT, 2));

      -- Snapshot survives product edits; stock is what must move.
      IF v_line ->> 'variant_id' IS NOT NULL THEN
        UPDATE public.product_variants
           SET stock = GREATEST(0, stock - (v_line ->> 'quantity')::INT)
         WHERE id = (v_line ->> 'variant_id')::UUID;
      END IF;
      UPDATE public.products
         SET stock = GREATEST(0, stock - (v_line ->> 'quantity')::INT)
       WHERE id = (v_line ->> 'product_id')::UUID;
    END LOOP;

    INSERT INTO public.payments (
        order_id, provider, status, amount, currency, exchange_rate,
        transaction_ref, is_sandbox, raw)
    VALUES (
        v_order_id,
        CASE WHEN v_payment_method = 'credit_card' THEN 'sandbox_card'
             WHEN v_payment_method = 'paypal' THEN 'sandbox_paypal'
             ELSE v_payment_method::TEXT END,
        v_payment,
        v_total,
        'USD',
        COALESCE(NULLIF(p_exchange_rate, 0), 1),
        'SIM-' || upper(substr(md5(v_order_number || v_uid::TEXT), 1, 12)),
        TRUE,
        jsonb_build_object(
          'simulated', TRUE,
          'order_number', v_order_number,
          'payment_method', v_payment_method::TEXT,
          'display_currency', COALESCE(NULLIF(p_display_currency, ''), 'USD'),
          'display_amount', round(v_total * COALESCE(NULLIF(p_exchange_rate, 0), 1), 2),
          'recorded_at', NOW()));
  END LOOP;

  -- Cleared only after every order row exists, in the same transaction.
  DELETE FROM public.cart_items WHERE cart_id = v_cart;

  RETURN QUERY
    SELECT o.* FROM public.orders o
     WHERE o.id = ANY(v_created)
     ORDER BY o.created_at;
END;
$$;

COMMENT ON FUNCTION public.place_order(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT) IS
  'Atomic checkout. Prices and stock come from the database, one order per vendor store, simulated payment recorded, cart cleared.';

-- ---------------------------------------------------------------------------
-- update_order_status: replaces the 002 UPDATE policy that let a seller rewrite
-- totals and payment_status. Roles are checked here, not in a policy.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id UUID,
  p_status TEXT,
  p_payment_status TEXT DEFAULT NULL)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_order public.orders%ROWTYPE;
  v_is_owner BOOLEAN := FALSE;
  v_status public.order_status;
  v_payment public.payment_status;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign-in required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;

  BEGIN
    v_status := p_status::public.order_status;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Unknown order status "%"', COALESCE(p_status, '');
  END;

  IF v_order.user_id = v_uid THEN
    -- A buyer may only cancel while nothing has shipped.
    IF v_status <> 'cancelled' THEN
      RAISE EXCEPTION 'You can only cancel your own pending order' USING ERRCODE = '42501';
    END IF;
    IF v_order.status NOT IN ('pending', 'processing') THEN
      RAISE EXCEPTION 'This order can no longer be cancelled' USING ERRCODE = '42501';
    END IF;
  ELSIF EXISTS (SELECT 1 FROM public.stores s
                 WHERE s.id = v_order.store_id AND s.user_id = v_uid) THEN
    IF v_status = 'cancelled' THEN
      RAISE EXCEPTION 'Only an administrator can cancel an order' USING ERRCODE = '42501';
    END IF;
    IF v_status = 'completed' AND v_order.payment_status <> 'paid' THEN
      RAISE EXCEPTION 'Order is not paid yet' USING ERRCODE = '42501';
    END IF;
  ELSIF public.is_admin() THEN
    NULL;  -- admin may set any status
  ELSE
    RAISE EXCEPTION 'Not allowed to change this order' USING ERRCODE = '42501';
  END IF;

  -- payment_status moves only for admins; a seller cannot mark an order paid.
  IF p_payment_status IS NOT NULL THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only an administrator can change the payment status' USING ERRCODE = '42501';
    END IF;
    BEGIN
      v_payment := p_payment_status::public.payment_status;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Unknown payment status "%"', COALESCE(p_payment_status, '');
    END;
  ELSE
    v_payment := v_order.payment_status;
  END IF;

  IF v_payment = 'paid' AND v_order.payment_status <> 'paid' THEN
    v_status := CASE WHEN v_status = 'pending' THEN 'processing'::public.order_status
                     ELSE v_status END;
  END IF;

  UPDATE public.orders
     SET status = v_status,
         payment_status = v_payment,
         paid_at = CASE WHEN v_payment = 'paid'
                        THEN COALESCE(public.orders.paid_at, NOW())
                        ELSE public.orders.paid_at END,
         cancelled_at = CASE WHEN v_status = 'cancelled' THEN NOW()
                             ELSE public.orders.cancelled_at END
   WHERE id = p_order_id;

  RETURN QUERY SELECT o.* FROM public.orders o WHERE o.id = p_order_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- submit_review: only after a paid order actually contained the product, and one
-- review per customer per product. The 002 policy alone allowed a review from
-- somebody who never bought anything.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_review(
  p_product_id UUID,
  p_rating INT,
  p_review_text TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_review_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign-in required to leave a review' USING ERRCODE = '42501';
  END IF;
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  IF p_review_text IS NULL OR length(btrim(p_review_text)) < 4 THEN
    RAISE EXCEPTION 'Please write a few words about the product';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id AND status = 'published') THEN
    RAISE EXCEPTION 'Product not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
     WHERE o.user_id = v_uid
       AND o.payment_status = 'paid'
       AND oi.product_id = p_product_id) THEN
    RAISE EXCEPTION 'You can review this product only after purchasing it' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.product_reviews (product_id, user_id, rating, review_text)
  VALUES (p_product_id, v_uid, p_rating, btrim(p_review_text))
  ON CONFLICT (product_id, user_id) DO UPDATE
    SET rating = EXCLUDED.rating,
        review_text = EXCLUDED.review_text
  RETURNING id INTO v_review_id;

  RETURN v_review_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants: these functions are the app write path, so authenticated needs EXECUTE.
-- Public is revoked because Supabase grants function EXECUTE to PUBLIC by default.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.my_cart_id()',
    'public.cart_add_item(uuid,int,uuid)',
    'public.cart_set_quantity(uuid,int)',
    'public.cart_remove_item(uuid)',
    'public.cart_clear()',
    'public.checkout_rules()',
    'public.coupon_discount(text,numeric)',
    'public.place_order(text,text,text,jsonb,text,text,text,numeric,text,text)',
    'public.update_order_status(uuid,text,text)',
    'public.submit_review(uuid,int,text)'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
  END LOOP;
END $$;

-- checkout_rules and coupon_discount are read by the storefront to show real numbers.
REVOKE ALL ON FUNCTION public.checkout_rules() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.checkout_rules() TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.checkout_rules() IS
  'Single source of truth for shipping thresholds, so the UI stops hardcoding them.';
COMMENT ON FUNCTION public.update_order_status(UUID, TEXT, TEXT) IS
  'Role-checked status transition. payment_status changes are admin-only.';
