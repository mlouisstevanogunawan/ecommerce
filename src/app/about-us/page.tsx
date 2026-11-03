import Link from 'next/link';
import { ChevronRight, MessageCircle, PackageCheck, ShieldCheck, Wallet } from 'lucide-react';
import { getPlatformStats, getSiteSettings } from '@/lib/supabase/data';

export const revalidate = 300;

export default async function AboutUsPage() {
  const [settings, stats] = await Promise.all([getSiteSettings(), getPlatformStats()]);

  const tiles = [
    { value: stats.products, label: 'Products on sale' },
    { value: stats.stores, label: 'Stores' },
    { value: stats.categories, label: 'Categories' },
    { value: stats.reviews, label: 'Customer reviews' },
  ];

  const values = [
    {
      Icon: PackageCheck,
      title: 'Moderated listings',
      body: 'A seller can submit a product, but it only appears in the catalogue once a marketplace admin has published it.',
    },
    {
      Icon: MessageCircle,
      title: 'Direct seller contact',
      body: 'Each product page exposes the store it belongs to, so you can message the seller before you order.',
    },
    {
      Icon: ShieldCheck,
      title: 'Account-owned orders',
      body: 'Orders, addresses and wishlists are stored against your own account and are readable only by you and the seller of each item.',
    },
    {
      Icon: Wallet,
      title: 'Prices in your currency',
      body: 'Displayed prices are converted from the marketplace currency using the exchange rates loaded on this site.',
    },
  ];

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="modesy-container max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 font-medium">
          <Link href="/" className="hover:text-brand transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-900 font-bold">About Us</span>
        </nav>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
          {/* Hero Banner */}
          <div className="relative h-48 sm:h-64 bg-gray-900 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-8 text-white">
              <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight">
                About {settings.site_title}
              </h1>
            </div>
          </div>

          <div className="p-6 sm:p-10 space-y-8">
            <div className="text-sm sm:text-base text-gray-700 leading-relaxed space-y-4">
              <p>{settings.site_description}</p>
              <p>
                Sellers open a store, list their items, and manage their own orders. Buyers search the
                published catalogue, add items to a cart, and check out with a saved address.
              </p>
            </div>

            {/* Numbers Strip — counted from the database on every revalidation */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-y border-gray-100 text-center">
              {tiles.map((tile) => (
                <div key={tile.label}>
                  <span className="text-2xl sm:text-3xl font-black text-brand block">
                    {tile.value.toLocaleString('en-US')}
                  </span>
                  <span className="text-xs text-gray-500 font-semibold">{tile.label}</span>
                </div>
              ))}
            </div>

            {/* Core Values */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">How the marketplace works</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {values.map(({ Icon, title, body }) => (
                  <div key={title} className="p-4 rounded-lg bg-gray-50 border border-gray-100 flex items-start gap-3">
                    <Icon className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-gray-900 mb-1">{title}</h5>
                      <p className="text-gray-500">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-gray-500 border-t border-gray-100 pt-4 space-y-1">
              <p>Contact: {settings.contact_email} · {settings.contact_phone}</p>
              <p>{settings.address}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
