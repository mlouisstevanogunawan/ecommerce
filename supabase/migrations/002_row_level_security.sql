-- Migration 002: Row Level Security (RLS) Policies
-- Enforcing strict multi-tenant and role-based permissions

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Helper Function to check if user is Admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. PROFILES POLICIES
-- Anyone can view public seller profiles; authenticated users can view/edit their own profile; admins can view/edit all.
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
ON profiles FOR ALL USING (is_admin());

-- 2. STORES POLICIES
CREATE POLICY "Stores are viewable by everyone"
ON stores FOR SELECT USING (true);

CREATE POLICY "Sellers can create a store"
ON stores FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sellers can update their own store"
ON stores FOR UPDATE USING (auth.uid() = user_id OR is_admin());

-- 3. CATEGORIES POLICIES
CREATE POLICY "Categories are viewable by everyone"
ON categories FOR SELECT USING (true);

CREATE POLICY "Only admins can manage categories"
ON categories FOR ALL USING (is_admin());

-- 4. PRODUCTS POLICIES
CREATE POLICY "Published products are viewable by everyone"
ON products FOR SELECT USING (
    status = 'published' OR 
    (auth.uid() IS NOT NULL AND store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())) OR
    is_admin()
);

CREATE POLICY "Sellers can create products for their store"
ON products FOR INSERT WITH CHECK (
    store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()) OR is_admin()
);

CREATE POLICY "Sellers can update their own products"
ON products FOR UPDATE USING (
    store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()) OR is_admin()
);

CREATE POLICY "Sellers can delete their own products"
ON products FOR DELETE USING (
    store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()) OR is_admin()
);

-- 5. PRODUCT IMAGES & VARIANTS POLICIES
CREATE POLICY "Images viewable by everyone"
ON product_images FOR SELECT USING (true);

CREATE POLICY "Sellers manage product images"
ON product_images FOR ALL USING (
    product_id IN (SELECT id FROM products WHERE store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())) OR is_admin()
);

CREATE POLICY "Variants viewable by everyone"
ON product_variants FOR SELECT USING (true);

CREATE POLICY "Sellers manage product variants"
ON product_variants FOR ALL USING (
    product_id IN (SELECT id FROM products WHERE store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())) OR is_admin()
);

-- 6. USER ADDRESSES POLICIES
CREATE POLICY "Users can manage own addresses"
ON user_addresses FOR ALL USING (auth.uid() = user_id);

-- 7. WISHLISTS POLICIES
CREATE POLICY "Users can manage own wishlist"
ON wishlists FOR ALL USING (auth.uid() = user_id);

-- 8. CARTS & CART ITEMS POLICIES
CREATE POLICY "Users can manage own cart"
ON carts FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can manage cart items"
ON cart_items FOR ALL USING (
    cart_id IN (SELECT id FROM carts WHERE user_id = auth.uid() OR user_id IS NULL)
);

-- 9. COUPONS POLICIES
CREATE POLICY "Active coupons viewable by everyone"
ON coupons FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

CREATE POLICY "Admins manage coupons"
ON coupons FOR ALL USING (is_admin());

-- 10. ORDERS POLICIES
CREATE POLICY "Customers can view own orders"
ON orders FOR SELECT USING (
    auth.uid() = user_id OR
    store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()) OR
    is_admin()
);

CREATE POLICY "Customers can create orders"
ON orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Sellers and Admins can update order status"
ON orders FOR UPDATE USING (
    store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()) OR is_admin()
);

CREATE POLICY "Order items viewable by order owners, sellers, admins"
ON order_items FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid() OR store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())) OR is_admin()
);

CREATE POLICY "Order items insertable during checkout"
ON order_items FOR INSERT WITH CHECK (true);

-- 11. REVIEWS POLICIES
CREATE POLICY "Reviews viewable by everyone"
ON product_reviews FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reviews"
ON product_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 12. BLOG & SETTINGS POLICIES
CREATE POLICY "Blog viewable by everyone"
ON blog_posts FOR SELECT USING (published = true OR is_admin());

CREATE POLICY "Blog categories viewable by everyone"
ON blog_categories FOR SELECT USING (true);

CREATE POLICY "Admins manage blog"
ON blog_posts FOR ALL USING (is_admin());

CREATE POLICY "Admins manage blog categories"
ON blog_categories FOR ALL USING (is_admin());

CREATE POLICY "Site settings viewable by everyone"
ON site_settings FOR SELECT USING (true);

CREATE POLICY "Admins manage site settings"
ON site_settings FOR ALL USING (is_admin());

-- 13. CONTACT MESSAGES
CREATE POLICY "Anyone can submit contact message"
ON contact_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Only admins view contact messages"
ON contact_messages FOR SELECT USING (is_admin());
