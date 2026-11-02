'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Facebook, Twitter, Instagram, Youtube, CheckCircle2 
} from 'lucide-react';
import { useTranslation } from '@/components/i18n/I18nProvider';

export function Footer() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="bg-white border-t border-gray-200 mt-16 text-gray-600">
      {/* Upper Footer */}
      <div className="modesy-container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
          {/* Col 1: About & Social */}
          <div className="lg:col-span-4 space-y-4">
            <Link href="/" className="inline-block">
              <span className="text-3xl font-extrabold tracking-tight text-gray-900 font-sans">
                mode<span className="text-brand">sy</span>
              </span>
            </Link>
            <p className="text-sm text-gray-600 leading-relaxed pr-4">
              {t('footer.brandBio')}
            </p>
            <div className="flex items-center space-x-3 pt-2">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-brand hover:text-white flex items-center justify-center text-gray-600 transition"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-brand hover:text-white flex items-center justify-center text-gray-600 transition"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-brand hover:text-white flex items-center justify-center text-gray-600 transition"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-brand hover:text-white flex items-center justify-center text-gray-600 transition"
                aria-label="YouTube"
              >
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 2: Categories */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider">{t('nav.categories')}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/categories/clothing" className="hover:text-brand">{t('categories.clothing')}</Link></li>
              <li><Link href="/categories/shoes" className="hover:text-brand">{t('categories.shoes')}</Link></li>
              <li><Link href="/categories/home-living" className="hover:text-brand">{t('categories.homeLiving')}</Link></li>
              <li><Link href="/categories/jewelry-accessories" className="hover:text-brand">{t('categories.accessories')}</Link></li>
              <li><Link href="/categories/toys-entertainment" className="hover:text-brand">{t('categories.toys')}</Link></li>
              <li><Link href="/categories/electronics" className="hover:text-brand">{t('categories.electronics')}</Link></li>
            </ul>
          </div>

          {/* Col 3: Quick Links & Information */}
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-3">
              <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider">{t('footer.quickLinks')}</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="hover:text-brand">{t('nav.home')}</Link></li>
                <li><Link href="/blog" className="hover:text-brand">{t('nav.blog')}</Link></li>
                <li><Link href="/shops" className="hover:text-brand">{t('nav.shops')}</Link></li>
                <li><Link href="/help-center" className="hover:text-brand">{t('footer.help')}</Link></li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider">{t('footer.customerService')}</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about-us" className="hover:text-brand">{t('footer.aboutUs')}</Link></li>
                <li><Link href="/terms-conditions" className="hover:text-brand">{t('footer.terms')}</Link></li>
              </ul>
            </div>
          </div>

          {/* Col 4: Newsletter & Payments */}
          <div className="lg:col-span-4 space-y-4">
            <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider">{t('footer.newsletterTitle')}</h4>
            <p className="text-sm text-gray-600">
              {t('footer.newsletterDesc')}
            </p>
            {subscribed ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-md border border-emerald-200">
                <CheckCircle2 className="w-5 h-5" />
                <span>{t('common.success')}!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('footer.emailPlaceholder')}
                  required
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-md shadow-sm transition shrink-0"
                >
                  {t('footer.subscribe')}
                </button>
              </form>
            )}

            {/* Payment Icons */}
            <div className="pt-4 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                Accepted Payment Methods
              </span>
              <div className="flex items-center space-x-2">
                {['visa', 'mastercard', 'maestro', 'amex', 'discover'].map((card) => (
                  <span
                    key={card}
                    className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded text-xs font-bold text-gray-700 uppercase"
                  >
                    {card}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-100 bg-gray-50 py-4 text-xs text-gray-500">
        <div className="modesy-container flex flex-col md:flex-row justify-between items-center gap-2">
          <p>© {new Date().getFullYear()} Modesy - {t('footer.allRights')}</p>
          <div className="flex items-center space-x-4">
            <Link href="/privacy-policy" className="hover:text-brand hover:underline">
              {t('footer.privacy')}
            </Link>
            <Link href="/terms-conditions" className="hover:text-brand hover:underline">
              {t('footer.terms')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
