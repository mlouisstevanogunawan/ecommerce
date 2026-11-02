import React from 'react';
import Link from 'next/link';
import { ChevronRight, Award, Users, ShieldCheck, Globe, CheckCircle2 } from 'lucide-react';

export default function AboutUsPage() {
  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="modesy-container max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 font-medium">
          <Link href="/" className="hover:text-brand transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-900 font-bold">About Us</span>
        </nav>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
          {/* Hero Banner */}
          <div className="relative h-64 sm:h-80 bg-gray-900 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80"
              alt="Modesy Team"
              className="w-full h-full object-cover opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-8 text-white">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400 mb-1">
                Empowering Creators Worldwide
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight">
                About Modesy Marketplace
              </h1>
            </div>
          </div>

          <div className="p-6 sm:p-10 space-y-8">
            <div className="text-sm sm:text-base text-gray-700 leading-relaxed space-y-4">
              <p>
                Modesy is a premier multi-vendor marketplace platform founded with a mission to bridge 
                discerning shoppers with passionate independent creators, bespoke designers, and verified retailers worldwide.
              </p>
              <p>
                Whether you are looking for handcrafted clothing, minimalist footwear, elegant home decor, or digital assets, 
                Modesy provides a seamless, secure, and inspiring shopping experience.
              </p>
            </div>

            {/* Numbers Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-y border-gray-100 text-center">
              <div>
                <span className="text-2xl sm:text-3xl font-black text-brand block">10,000+</span>
                <span className="text-xs text-gray-500 font-semibold">Curated Products</span>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-black text-brand block">450+</span>
                <span className="text-xs text-gray-500 font-semibold">Verified Sellers</span>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-black text-brand block">85+</span>
                <span className="text-xs text-gray-500 font-semibold">Countries Shipped</span>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-black text-brand block">99.8%</span>
                <span className="text-xs text-gray-500 font-semibold">Satisfied Buyers</span>
              </div>
            </div>

            {/* Core Values */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Why Customers Trust Us</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-100 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-gray-900 mb-1">Authenticity Guaranteed</h5>
                    <p className="text-gray-500">Every vendor undergoes strict identity and quality checks before publishing items.</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gray-50 border border-gray-100 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-gray-900 mb-1">Buyer Protection Guarantee</h5>
                    <p className="text-gray-500">Your payments are held securely in escrow until order delivery is verified.</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gray-50 border border-gray-100 flex items-start gap-3">
                  <Globe className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-gray-900 mb-1">Direct Vendor Communication</h5>
                    <p className="text-gray-500">Chat directly via WhatsApp or Ask Question modal with store creators.</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gray-50 border border-gray-100 flex items-start gap-3">
                  <Award className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-gray-900 mb-1">Transparent Pricing</h5>
                    <p className="text-gray-500">No hidden fees, simple shipping rates, and fair marketplace commissions.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
