import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function TermsConditionsPage() {
  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="modesy-container max-w-4xl">
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 font-medium">
          <Link href="/" className="hover:text-brand transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-900 font-bold">Terms & Conditions</span>
        </nav>

        <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-12 shadow-xs space-y-6 text-xs sm:text-sm text-gray-700 leading-relaxed">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 pb-4 border-b border-gray-100">
            Terms & Conditions
          </h1>
          <p className="text-gray-400 text-xs">Last updated: October 2026</p>

          <h3 className="font-bold text-gray-900 text-base pt-2">1. Introduction & Acceptance</h3>
          <p>
            Welcome to Modesy. By accessing or using our multi-vendor marketplace website, services, 
            and applications, you agree to comply with and be bound by these Terms and Conditions.
          </p>

          <h3 className="font-bold text-gray-900 text-base pt-2">2. Marketplace Multi-Vendor Relationship</h3>
          <p>
            Modesy operates as an online marketplace facilitating commercial transactions between buyers and 
            third-party independent vendors. Modesy is not the manufacturer of goods sold by vendors unless expressly indicated.
          </p>

          <h3 className="font-bold text-gray-900 text-base pt-2">3. Orders, Pricing, and Payments</h3>
          <p>
            All prices displayed on product cards are set by individual vendors and subject to applicable taxes. 
            Payment is captured at the moment of order placement and verified through secure gateway services.
          </p>

          <h3 className="font-bold text-gray-900 text-base pt-2">4. Prohibited Activities</h3>
          <p>
            Users are strictly prohibited from listing counterfeit, trademark-infringing, stolen, or hazardous materials. 
            Violations will result in permanent store suspension and law enforcement notification.
          </p>
        </div>
      </div>
    </div>
  );
}
