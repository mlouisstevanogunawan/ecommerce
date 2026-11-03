'use client';

import React, { useState } from 'react';
import { MapPin, X } from 'lucide-react';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation?: (country: string, state: string, city: string) => void;
}

export const LOCATION_STORAGE_KEY = 'modesy_location';

// Reference list only: it names countries, it stores no shop data.
const COUNTRIES = [
  'United States',
  'Indonesia',
  'Germany',
  'United Kingdom',
  'Australia',
  'Canada',
  'France',
  'Brazil',
];

export function LocationModal({ isOpen, onClose, onSelectLocation }: LocationModalProps) {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCountry) return;
    if (onSelectLocation) {
      onSelectLocation(selectedCountry, selectedState, selectedCity);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-md bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand" />
            <h3 className="font-bold text-gray-900 text-lg">Select Location</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Choose the area you want shown in the header. This label is saved in your browser only and does
            not change shipping costs or product availability.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Country
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            >
              <option value="" disabled>
                Select a country
              </option>
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              State / Region
            </label>
            <input
              type="text"
              placeholder="e.g. California, DKI Jakarta, Bavaria"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              City
            </label>
            <input
              type="text"
              placeholder="e.g. San Diego, Jakarta, Berlin"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-brand hover:bg-brand-dark text-white font-semibold rounded-md shadow-sm transition"
            >
              Update Location
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
