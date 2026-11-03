'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';
import { useTranslation } from '@/components/i18n/I18nProvider';

export function CookiesWarning() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const accepted = localStorage.getItem('modesy_cookies_accepted');
      if (!accepted) {
        setShow(true);
      }
    } catch {
      // In case localStorage is blocked
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem('modesy_cookies_accepted', '1');
    } catch {
      // Ignore storage errors
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#222222] text-white py-3.5 px-4 shadow-2xl border-t border-gray-700 animate-slideUp">
      <div className="modesy-container flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5 text-gray-200">
          <Cookie className="w-5 h-5 text-brand shrink-0" />
          <span>
            We use cookies to ensure that we give you the best experience on our website.
            By continuing to browse, you agree to our{' '}
            <Link href="/terms-conditions" className="text-brand hover:underline font-semibold">
              {t('footer.terms')}
            </Link>.
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleAccept}
            className="px-5 py-1.5 bg-brand hover:bg-brand-dark text-white font-bold rounded text-xs transition shadow-sm"
          >
            {t('common.apply')}
          </button>
        </div>
      </div>
    </div>
  );
}
