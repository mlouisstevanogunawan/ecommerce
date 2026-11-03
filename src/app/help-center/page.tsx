'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, ChevronRight, ChevronDown, Search, ArrowRight } from 'lucide-react';

const FAQS = [
  {
    q: 'How does the multi-vendor marketplace work?',
    a: 'The marketplace lists products from independent stores. When you order, each store prepares, packages and ships its own items, and your cart is split into one order per store at checkout.',
  },
  {
    q: 'What payment methods are supported?',
    a: 'Cash on delivery and direct bank transfer are recorded as unpaid orders that the store settles with you. A card option also exists, but no payment processor is connected yet: choosing it records a clearly flagged sandbox payment, no card details are collected, and no money is charged.',
  },
  {
    q: 'How can I track my shipment?',
    a: 'Open "My Orders" in your account. Each order shows the status the seller last set (pending, processing, shipped, completed or cancelled) plus the store it came from. Courier tracking numbers are not stored by this marketplace yet, so arrange handover with the seller through the contact details on their store page.',
  },
  {
    q: 'What happens if an item is wrong or damaged?',
    a: 'There is no automated returns or refunds form yet. Contact the seller from their store page, or send the support desk a message through the contact page, and the claim is handled manually with that store.',
  },
  {
    q: 'How do I open my own store?',
    a: 'Tick "register as a vendor" on the sign-up form, then open the seller dashboard. Set your store name, description, phone and address under Store Settings and start listing products. Seller payouts are handled offline; the dashboard tracks orders, stock and revenue instead.',
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
              onChange={(e) => {
                setSearch(e.target.value);
                // openIndex points into the filtered list, so a new search would
                // otherwise leave a different question expanded.
                setOpenIndex(0);
              }}
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

            {filteredFaqs.length === 0 && (
              <div className="py-6 text-center">
                <p className="text-sm font-bold text-gray-900">
                  No answer matches “{search.trim()}”.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  These {FAQS.length} questions are all the help center has, so try a word like{' '}
                  <em>payment</em>, <em>shipping</em> or <em>store</em>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setOpenIndex(0);
                  }}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                >
                  Clear the search
                </button>
              </div>
            )}
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
