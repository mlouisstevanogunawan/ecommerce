import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function PrivacyPolicyPage() {
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

          <h3 className="font-bold text-gray-900 text-base pt-2">3. Cookies & Analytics</h3>
          <p>
            We use essential session cookies to remember your shopping cart items, currency preferences, 
            and authentication status. We never sell your personal data to third parties.
          </p>

          <h3 className="font-bold text-gray-900 text-base pt-2">4. Your Rights & GDPR Compliance</h3>
          <p>
            You have the right to request access, correction, or deletion of your personal data at any time 
            by contacting our data protection officer at privacy@modesy.com.
          </p>
        </div>
      </div>
    </div>
  );
}
