import Link from 'next/link';
import { Store as StoreIcon, ChevronRight, UserCheck, Search, Star } from 'lucide-react';
import { getShops } from '@/lib/supabase/data';

interface ShopsPageProps {
  searchParams: Promise<{ q?: string }>;
}

export const revalidate = 60;

export default async function ShopsPage({ searchParams }: ShopsPageProps) {
  const { q } = await searchParams;
  const shops = await getShops(q);

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="modesy-container">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 font-medium">
          <Link href="/" className="hover:text-brand transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-900 font-bold">Shops</span>
        </nav>

        {/* Header & Search */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8 mb-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <StoreIcon className="w-6 h-6 text-brand" />
              <span>Multi-Vendor Shops Directory</span>
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Discover verified independent creators, local boutiques, and authorized brands.
            </p>
          </div>

          <form action="/shops" method="GET" className="relative w-full md:w-80">
            <input
              type="text"
              name="q"
              defaultValue={q || ''}
              placeholder="Search store name..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:border-brand"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </form>
        </div>

        {/* Shops Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {shops.map((store) => (
            <div
              key={store.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
            >
              {/* Cover Banner */}
              <div className="relative h-28 bg-gray-900 overflow-hidden">
                <img
                  src={store.cover_url || '/placeholder-product.svg'}
                  alt={store.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                />
              </div>

              {/* Store Meta & Avatar */}
              <div className="px-6 pb-6 pt-0 relative flex-grow flex flex-col justify-between">
                <div>
                  {/* Floating Avatar */}
                  <div className="relative -mt-10 mb-3 w-16 h-16 rounded-full border-4 border-white overflow-hidden shadow-xs bg-white">
                    <img
                      src={store.logo_url || '/placeholder-product.svg'}
                      alt={store.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 mb-1">
                    <h3 className="font-bold text-base text-gray-900 group-hover:text-brand transition">
                      <Link href={`/profile/${store.slug}`}>{store.title}</Link>
                    </h3>
                    {store.is_verified && (
                      <span title="Verified Vendor">
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                    {store.description}
                  </p>
                </div>

                <div>
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-gray-100 text-center text-xs mb-4">
                    <div>
                      <span className="font-bold text-gray-900 block">{store.products_count}</span>
                      <span className="text-[11px] text-gray-400">Products</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-900 block">{store.sales_count}</span>
                      <span className="text-[11px] text-gray-400">Sales</span>
                    </div>
                    <div>
                      <span className="font-bold text-amber-500 flex items-center justify-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-500" />
                        {store.rating}
                      </span>
                      <span className="text-[11px] text-gray-400">Rating</span>
                    </div>
                  </div>

                  {/* Button */}
                  <Link
                    href={`/profile/${store.slug}`}
                    className="w-full block text-center py-2 px-4 bg-gray-50 hover:bg-brand hover:text-white border border-gray-200 hover:border-brand rounded text-xs font-bold transition text-gray-700"
                  >
                    Visit Store
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
