-- Migration 003: Storage Buckets & Policies for Modesy Marketplace

-- 1. Create Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('products', 'products', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('covers', 'covers', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('blog', 'blog', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('digital_files', 'digital_files', false, 104857600, NULL)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies
-- Public view for public buckets
CREATE POLICY "Public Access Products" ON storage.objects
FOR SELECT USING (bucket_id IN ('products', 'avatars', 'covers', 'blog'));

-- Authenticated upload for avatars
CREATE POLICY "Users can upload avatar" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

-- Sellers & Admins upload to products & covers
CREATE POLICY "Sellers can upload product images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id IN ('products', 'covers', 'digital_files') AND auth.uid() IS NOT NULL);

-- Admins upload to blog
CREATE POLICY "Admins can upload to blog" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'blog' AND auth.uid() IS NOT NULL);
