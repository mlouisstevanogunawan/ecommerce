import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getSiteSettings } from '@/lib/supabase/data';

export const revalidate = 300;

export default async function PrivacyPolicyPage() {
  const settings = await getSiteSettings();

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="modesy-container max-w-4xl">
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 font-medium">
          <Link href="/" className="hover:text-brand transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-900 font-bold">Privacy Policy</span>
        </nav>

        <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-12 shadow-xs space-y-6 text-xs sm:text-sm text-gray-700 leading-relaxed">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 pb-4 border-b border-gray-100">
            Privacy Policy
          </h1>
          <p className="text-gray-400 text-xs">Last updated: October 2026</p>

          <h3 className="font-bold text-gray-900 text-base pt-2">1. Data We Collect</h3>
          <p>
            When you register, place an order, or subscribe to our newsletter, we collect personal information 
            including your name, email address, postal address, phone number, and transaction logs.
          </p>

          <h3 className="font-bold text-gray-900 text-base pt-2">2. How We Use Your Data</h3>
          <p>
            Your information is used strictly to process orders, facilitate vendor shipping, prevent fraud, 
            send operational notifications, and enhance your marketplace browsing experience.
          </p>

          <h3 className="font-bold text-gray-900 text-base pt-2">3. Cookies &amp; Local Storage</h3>
          <p>
            We use essential session cookies to keep you signed in, and cookies that remember your preferred
            currency and language. Guest carts are kept in your browser&apos;s local storage; signed-in carts and
            orders are stored in our database. We never sell your personal data to third parties.
          </p>

          <h3 className="font-bold text-gray-900 text-base pt-2">4. Your Rights</h3>
          <p>
            You can update most of your own details directly from your account pages. To request access to,
            correction of, or deletion of the rest of your personal data, contact us at{' '}
            <a href={`mailto:${settings.contact_email}`} className="font-bold text-brand hover:underline">
              {settings.contact_email}
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
