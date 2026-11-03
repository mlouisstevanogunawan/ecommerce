'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Facebook, Twitter, Instagram, Youtube, CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react';
import { useTranslation } from '@/components/i18n/I18nProvider';
import type { Category, SiteSettings } from '@/lib/types';

interface FooterProps {
  categories: Category[];
  settings: SiteSettings;
}

const SOCIALS = [
  { key: 'facebook_url', label: 'Facebook', Icon: Facebook },
  { key: 'twitter_url', label: 'Twitter', Icon: Twitter },
  { key: 'instagram_url', label: 'Instagram', Icon: Instagram },
  { key: 'youtube_url', label: 'YouTube', Icon: Youtube },
] as const;

export function Footer({ categories, settings }: FooterProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [errorText, setErrorText] = useState('');

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    setErrorText('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        setState('error');
        setErrorText(payload.error ?? 'Your subscription could not be saved.');
        return;
      }
      setState('done');
      setEmail('');
    } catch {
      setState('error');
      setErrorText('Network error. Please try again.');
    }
  }

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
              {/* An icon only renders when the admin has actually saved that
                  profile; bare domains would link to a site nobody owns. */}
              {SOCIALS.map(({ key, label, Icon }) => {
                const url = settings[key];
                if (!url) return null;
                return (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-brand hover:text-white flex items-center justify-center text-gray-600 transition"
                    aria-label={label}
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
            <ul className="space-y-1 pt-2 text-sm text-gray-600">
              <li>
                <a href={`mailto:${settings.contact_email}`} className="hover:text-brand">
                  {settings.contact_email}
                </a>
              </li>
              <li>{settings.contact_phone}</li>
              <li className="max-w-xs">{settings.address}</li>
            </ul>
          </div>

          {/* Col 2: Categories */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider">{t('nav.categories')}</h4>
            <ul className="space-y-2 text-sm">
              {categories.slice(0, 6).map((cat) => (
                <li key={cat.id}>
                  <Link href={`/categories/${cat.slug}`} className="hover:text-brand">
                    {cat.name}
                  </Link>
                </li>
              ))}
              {categories.length === 0 && (
                <li className="text-xs text-gray-400 italic">No categories yet</li>
              )}
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

          {/* Col 4: Newsletter */}
          <div className="lg:col-span-4 space-y-4">
            <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider">{t('footer.newsletterTitle')}</h4>
            <p className="text-sm text-gray-600">
              {t('footer.newsletterDesc')}
            </p>
            {state === 'done' ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-md border border-emerald-200">
                <CheckCircle2 className="w-5 h-5" />
                <span>{t('common.success')}!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="flex gap-2">
                  <label htmlFor="footer-newsletter-email" className="sr-only">
                    {t('footer.emailPlaceholder')}
                  </label>
                  <input
                    id="footer-newsletter-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('footer.emailPlaceholder')}
                    required
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                  />
                  <button
                    type="submit"
                    disabled={state === 'sending'}
                    className="px-4 py-2 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-semibold text-sm rounded-md shadow-sm transition shrink-0"
                  >
                    {state === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : t('footer.subscribe')}
                  </button>
                </div>
                {state === 'error' && (
                  <p className="flex items-center gap-1.5 text-xs text-rose-600">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errorText}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-100 bg-gray-50 py-4 text-xs text-gray-500">
        <div className="modesy-container flex flex-col md:flex-row justify-between items-center gap-2">
          <p>© {new Date().getFullYear()} {settings.site_title} - {t('footer.allRights')}</p>
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
