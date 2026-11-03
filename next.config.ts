import type { NextConfig } from "next";

// Product and avatar images are absolute URLs from Supabase Storage, so the
// project's own host has to be allowlisted for next/image. The hostname comes
// from the public URL env var; when it is missing the build stays on Unsplash
// only and any storage image fails loudly at render time instead of silently.
function supabaseStorageHost(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

const storageHost = supabaseStorageHost();

const nextConfig: NextConfig = {
  // /<slug> is the single product URL. The older /products/<slug> address still
  // appears in outside links, so it moves permanently instead of serving the same
  // page under two addresses.
  async redirects() {
    return [{ source: '/products/:slug', destination: '/:slug', permanent: true }];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      ...(storageHost ? [{ protocol: 'https' as const, hostname: storageHost }] : []),
    ],
  },
};

export default nextConfig;
