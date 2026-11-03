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
            Prices shown on product cards are the prices stored for that item and are set by the vendor. A
            discount price, when present, replaces the list price for the whole order. Orders are split per
            store, and stock is reduced when an order is accepted.
          </p>
          <p className="mt-2">
            No payment processor is connected to this marketplace yet. Choosing the card option places the
            order with a clearly flagged simulated payment; cash on delivery and bank transfer are recorded
            as unpaid until the vendor confirms settlement.
          </p>

          <h3 className="font-bold text-gray-900 text-base pt-2">4. Prohibited Activities</h3>
          <p>
            Users may not list counterfeit, trademark-infringing, stolen, or hazardous goods. Marketplace
            staff can unpublish a listing or change an account role at their discretion; please report
            violations through the contact page.
          </p>
        </div>
      </div>
    </div>
  );
}
