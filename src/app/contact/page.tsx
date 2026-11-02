import React from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, ChevronRight } from 'lucide-react';
import { getSiteSettings } from '@/lib/supabase/data';
import type { SiteSettings } from '@/lib/types';
import { ContactForm } from './ContactForm';

export const dynamic = 'force-dynamic';

export default async function ContactPage() {
  let settings: SiteSettings;
  try {
    settings = await getSiteSettings();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'The site settings could not be read.';
    return (
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="modesy-container">
          <div className="bg-white rounded-lg border border-red-200 p-6 text-sm text-red-700">
            Contact details are unavailable: {message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="modesy-container">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 font-medium">
          <Link href="/" className="hover:text-brand transition">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-900 font-bold">Contact Us</span>
        </nav>

        {/* Header Banner */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8 shadow-xs text-center max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">Get in Touch</h1>
          <p className="text-xs sm:text-sm text-gray-500">{settings.site_description}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Contact Details (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-xs space-y-6">
              <h3 className="font-bold text-sm text-gray-900 pb-3 border-b border-gray-100">
                Contact Information
              </h3>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-teal-50 text-brand flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <h4 className="font-bold text-gray-900 mb-0.5">{settings.site_title}</h4>
                  <p className="text-gray-500">{settings.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-teal-50 text-brand flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <h4 className="font-bold text-gray-900 mb-0.5">Phone</h4>
                  <p className="text-gray-500">{settings.contact_phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-teal-50 text-brand flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <h4 className="font-bold text-gray-900 mb-0.5">Email Support</h4>
                  <p className="text-gray-500">{settings.contact_email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-lg border border-gray-200 p-6 sm:p-8 shadow-xs">
            <h3 className="font-bold text-base text-gray-900 mb-4">Send Us a Direct Message</h3>
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
