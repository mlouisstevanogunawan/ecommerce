'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, ShoppingCart, Heart, MapPin, User, Menu, X, PlusCircle 
} from 'lucide-react';
import { MegaMenu } from './MegaMenu';
import { LocationModal } from './LocationModal';
import { AuthMenu } from '../auth/AuthMenu';
import { useCart } from '../cart/CartProvider';
import { useTranslation } from '@/components/i18n/I18nProvider';
import { CurrencySwitcher } from './CurrencySwitcher';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Category } from '@/lib/types';

interface HeaderProps {
  categories: Category[];
}

export function Header({ categories }: HeaderProps) {
  const router = useRouter();
  const { cartCount, wishlistIds } = useCart();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(t('nav.location'));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'main' | 'categories'>('main');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/products');
    }
  };

  return (
    <>
      <header className="w-full bg-white border-b border-gray-200">
        {/* 1. TOP BAR */}
        <div className="bg-[#f8f9fa] border-b border-gray-200 text-xs text-gray-600 py-1.5 hidden md:block">
          <div className="modesy-container flex justify-between items-center">
            {/* Left Nav */}
            <div className="flex items-center space-x-6">
              <Link href="/contact" className="hover:text-brand transition-colors font-medium">
                {t('nav.contact')}
              </Link>
              <Link href="/seller/dashboard" className="hover:text-brand transition-colors font-medium">
                {t('nav.startSelling')}
              </Link>
            </div>

            {/* Right Nav */}
            <div className="flex items-center space-x-5">
              {/* Location Selector */}
              <button
                type="button"
                onClick={() => setIsLocationOpen(true)}
                className="flex items-center gap-1 hover:text-brand transition-colors font-medium"
              >
                <MapPin className="w-3.5 h-3.5 text-gray-500" />
                <span>{selectedLocation}</span>
              </button>

              {/* Currency Dropdown */}
              <CurrencySwitcher />

              {/* Language Selector */}
              <LanguageSwitcher />

              {/* Auth links: the real session decides what is shown */}
              <AuthMenu />
            </div>
          </div>
        </div>

        {/* 2. MAIN HEADER */}
        <div className="modesy-container py-4 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-gray-600 hover:text-gray-900"
              aria-label="Open Mobile Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-gray-900 font-sans">
                mode<span className="text-brand">sy</span>
              </span>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl hidden md:block">
            <form onSubmit={handleSearch} className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('nav.searchPlaceholder')}
                className="w-full pl-4 pr-12 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition"
              />
              <button
                type="submit"
                className="absolute right-1 top-1 bottom-1 px-3.5 bg-brand hover:bg-brand-dark text-white rounded-md flex items-center justify-center transition"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Right Action Icons & Sell Now Button */}
          <div className="flex items-center space-x-4 sm:space-x-6">
            {/* Cart Icon */}
            <Link href="/cart" className="flex items-center gap-2 group">
              <div className="relative p-1">
                <ShoppingCart className="w-6 h-6 text-gray-700 group-hover:text-brand transition-colors" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-brand text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold text-gray-700 group-hover:text-brand hidden lg:inline">
                {t('nav.cart')}
              </span>
            </Link>

            {/* Wishlist Icon */}
            <Link href="/wishlist" className="flex items-center gap-2 group">
              <div className="relative p-1">
                <Heart className="w-6 h-6 text-gray-700 group-hover:text-brand transition-colors" />
                {wishlistIds.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                    {wishlistIds.length}
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold text-gray-700 group-hover:text-brand hidden lg:inline">
                {t('nav.wishlist')}
              </span>
            </Link>

            {/* Sell Now Button */}
            <Link
              href="/seller/products/new"
              className="flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-dark text-white text-sm font-bold rounded-md shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('nav.startSelling')}</span>
            </Link>
          </div>
        </div>

        {/* Mobile Search Form (visible on small screens) */}
        <div className="p-3 md:hidden border-t border-gray-100 bg-gray-50">
          <form onSubmit={handleSearch} className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('nav.searchPlaceholder')}
              className="w-full pl-3 pr-10 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-brand"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* 3. NAVIGATION MEGA MENU */}
        <MegaMenu categories={categories} />
      </header>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
          <div className="relative w-80 max-w-full bg-white h-full shadow-2xl flex flex-col z-10 animate-slideRight">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <span className="font-bold text-lg text-gray-900">Modesy</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 text-gray-500" aria-label="Close Menu">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Switchers */}
            <div className="p-4 bg-gray-50/70 border-b border-gray-200 space-y-3">
              <CurrencySwitcher variant="mobile" />
              <LanguageSwitcher variant="mobile" />
            </div>

            {/* Mobile Tabs */}
            <div className="flex border-b border-gray-200 text-sm font-bold">
              <button
                type="button"
                onClick={() => setActiveMobileTab('main')}
                className={`flex-1 py-3 text-center ${
                  activeMobileTab === 'main' ? 'text-brand border-b-2 border-brand bg-white' : 'text-gray-500 bg-gray-50'
                }`}
              >
                {t('nav.mainMenu')}
              </button>
              <button
                type="button"
                onClick={() => setActiveMobileTab('categories')}
                className={`flex-1 py-3 text-center ${
                  activeMobileTab === 'categories' ? 'text-brand border-b-2 border-brand bg-white' : 'text-gray-500 bg-gray-50'
                }`}
              >
                {t('nav.categories')}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeMobileTab === 'main' ? (
                <ul className="space-y-2 text-sm font-medium text-gray-800">
                  <li><Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="block py-2 hover:text-brand">{t('nav.home')}</Link></li>
                  <li><Link href="/products" onClick={() => setIsMobileMenuOpen(false)} className="block py-2 hover:text-brand">{t('nav.products')}</Link></li>
                  <li><Link href="/shops" onClick={() => setIsMobileMenuOpen(false)} className="block py-2 hover:text-brand">{t('nav.shops')}</Link></li>
                  <li><Link href="/blog" onClick={() => setIsMobileMenuOpen(false)} className="block py-2 hover:text-brand">{t('nav.blog')}</Link></li>
                  <li><Link href="/contact" onClick={() => setIsMobileMenuOpen(false)} className="block py-2 hover:text-brand">{t('nav.contact')}</Link></li>
                  <li><Link href="/seller/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="block py-2 text-brand font-bold">{t('nav.sellerDashboard')}</Link></li>
                  <li><Link href="/admin/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="block py-2 text-purple-700 font-bold">{t('nav.adminDashboard')}</Link></li>
                  <li className="pt-4 border-t border-gray-100">
                    <Link
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full py-2.5 px-4 bg-brand text-white rounded-md font-bold text-center"
                    >
                      {t('nav.login')} / {t('nav.register')}
                    </Link>
                  </li>
                </ul>
              ) : (
                <ul className="space-y-2 text-sm font-medium text-gray-800">
                  {categories.map((cat) => (
                    <li key={cat.id} className="border-b border-gray-100 pb-2">
                      <Link
                        href={`/categories/${cat.slug}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="font-bold text-gray-900 block py-1.5 hover:text-brand"
                      >
                        {cat.name}
                      </Link>
                      {cat.children && (
                        <ul className="pl-3 mt-1 space-y-1">
                          {cat.children.map((sub) => (
                            <li key={sub.id}>
                              <Link
                                href={`/categories/${sub.slug}`}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="text-xs text-gray-600 block py-1 hover:text-brand"
                              >
                                {sub.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <LocationModal
        isOpen={isLocationOpen}
        onClose={() => setIsLocationOpen(false)}
        onSelectLocation={(country, state, city) => {
          setSelectedLocation(city || state || country);
        }}
      />
    </>
  );
}
