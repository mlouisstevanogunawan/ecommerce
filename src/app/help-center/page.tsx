'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, ChevronRight, ChevronDown, Search, ArrowRight, ShieldCheck, Truck, RefreshCw } from 'lucide-react';

const FAQS = [
  {
    q: 'How does the multi-vendor marketplace work?',
    a: 'Modesy connects independent vendors and brands directly with shoppers. When you purchase an item, the individual vendor prepares, packages, and ships the goods directly to your address.',
  },
  {
    q: 'What payment methods are supported?',
    a: 'We accept credit cards, debit cards, cash on delivery (COD for eligible domestic destinations), and direct bank wire transfers. All card transactions are encrypted with 256-bit SSL.',
  },
  {
    q: 'How can I track my shipment?',
    a: 'Once your order is processed, visit "My Orders" in your account dashboard. You will see tracking numbers and real-time status updates (Processing, Shipped, Completed).',
  },
  {
    q: 'What is your return & refund policy?',
    a: 'We offer a 30-day money-back guarantee. If the product received is damaged, counterfeit, or differs substantially from the description, you can initiate a dispute or return for a full refund.',
  },
  {
    q: 'How do I open my own store on Modesy?',
    a: 'Simply click "Sell on Modesy" in the top navigation, register your seller details, configure your store name and payout method, and start listing products immediately.',
  },
];

export default function HelpCenterPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [search, setSearch] = useState('');

  const filteredFaqs = FAQS.filter(
    (f) =>
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="modesy-container max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 font-medium">
          <Link href="/" className="hover:text-brand transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-900 font-bold">Help Center & FAQ</span>
        </nav>

        {/* Header & Search */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8 shadow-xs text-center">
          <HelpCircle className="w-12 h-12 text-brand mx-auto mb-3" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
            How can we help you?
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto mb-6">
            Find answers to frequently asked questions about orders, payments, shipping, and seller accounts.
          </p>

          <div className="relative max-w-md mx-auto">
            <input
              type="text"
              placeholder="Search help topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-brand shadow-xs"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </div>
        </div>

        {/* Accordion FAQ */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>

          <div className="divide-y divide-gray-100">
            {filteredFaqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left font-bold text-sm text-gray-900 hover:text-brand transition gap-4"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180 text-brand' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="mt-2 text-xs text-gray-600 leading-relaxed pr-6 animate-fadeIn">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-6 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Still need assistance?</span>
            <Link href="/contact" className="font-bold text-brand hover:underline flex items-center gap-1">
              Contact Customer Support <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
