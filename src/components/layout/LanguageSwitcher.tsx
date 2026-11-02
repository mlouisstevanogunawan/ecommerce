'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useTranslation } from '@/components/i18n/I18nProvider';
import { SUPPORTED_LOCALES } from '@/lib/i18n/config';

interface LanguageSwitcherProps {
  variant?: 'header' | 'mobile';
  className?: string;
}

function FlagIcon({ code }: { code: string }) {
  if (code === 'id') {
    // Indonesian Flag (Merah Putih: top red, bottom white)
    return (
      <span
        aria-hidden="true"
        className="inline-flex w-4 h-3 rounded-[2px] overflow-hidden border border-gray-300 shadow-[0_0_1px_rgba(0,0,0,0.2)] shrink-0"
      >
        <svg viewBox="0 0 16 12" className="w-full h-full">
          <rect width="16" height="6" fill="#E70011" />
          <rect y="6" width="16" height="6" fill="#FFFFFF" />
        </svg>
      </span>
    );
  }

  // US Flag for English (clean representation)
  return (
    <span
      aria-hidden="true"
      className="inline-flex w-4 h-3 rounded-[2px] overflow-hidden border border-gray-300 shadow-[0_0_1px_rgba(0,0,0,0.2)] shrink-0"
    >
      <svg viewBox="0 0 16 12" className="w-full h-full">
        {/* Red & white stripes */}
        <rect width="16" height="12" fill="#B22234" />
        <rect y="1" width="16" height="1" fill="#FFFFFF" />
        <rect y="3" width="16" height="1" fill="#FFFFFF" />
        <rect y="5" width="16" height="1" fill="#FFFFFF" />
        <rect y="7" width="16" height="1" fill="#FFFFFF" />
        <rect y="9" width="16" height="1" fill="#FFFFFF" />
        <rect y="11" width="16" height="1" fill="#FFFFFF" />
        {/* Blue Canton */}
        <rect width="7" height="6.5" fill="#3C3B6E" />
        {/* Canton star representation */}
        <circle cx="2" cy="2" r="0.6" fill="#FFFFFF" />
        <circle cx="5" cy="2" r="0.6" fill="#FFFFFF" />
        <circle cx="3.5" cy="3.5" r="0.6" fill="#FFFFFF" />
        <circle cx="2" cy="5" r="0.6" fill="#FFFFFF" />
        <circle cx="5" cy="5" r="0.6" fill="#FFFFFF" />
      </svg>
    </span>
  );
}

export function LanguageSwitcher({ variant = 'header', className = '' }: LanguageSwitcherProps) {
  const { locale, setLocale } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
        const currentIndex = SUPPORTED_LOCALES.findIndex((l) => l.code === locale);
        setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % SUPPORTED_LOCALES.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + SUPPORTED_LOCALES.length) % SUPPORTED_LOCALES.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < SUPPORTED_LOCALES.length) {
          setLocale(SUPPORTED_LOCALES[focusedIndex].code);
          setIsOpen(false);
          buttonRef.current?.focus();
        }
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const currentConfig = SUPPORTED_LOCALES.find((l) => l.code === locale) || SUPPORTED_LOCALES[0];

  if (variant === 'mobile') {
    return (
      <div className={`space-y-1 ${className}`}>
        <label htmlFor="mobile-language-select" className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
          Language
        </label>
        <select
          id="mobile-language-select"
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 text-xs font-medium text-gray-800 focus:outline-none focus:border-brand"
        >
          {SUPPORTED_LOCALES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.nativeName} ({l.name})
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`} onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        id="language-switcher-btn"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={`Select language, current language is ${currentConfig.name}`}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 hover:text-brand transition-colors font-medium text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-xs px-1 py-0.5"
      >
        <FlagIcon code={currentConfig.code} />
        <span>{currentConfig.nativeName}</span>
        <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Supported languages"
          className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-gray-200 rounded-md shadow-xl z-50 py-1 text-xs focus:outline-none animate-in fade-in zoom-in-95 duration-100"
        >
          {SUPPORTED_LOCALES.map((l, index) => {
            const isSelected = l.code === locale;
            const isFocused = index === focusedIndex;
            return (
              <li
                key={l.code}
                id={`lang-opt-${l.code}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setLocale(l.code);
                  setIsOpen(false);
                  buttonRef.current?.focus();
                }}
                onMouseEnter={() => setFocusedIndex(index)}
                className={`w-full flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                  isSelected ? 'bg-orange-50/70 text-brand font-bold' : 'text-gray-700 hover:bg-gray-100'
                } ${isFocused ? 'ring-1 ring-inset ring-brand/30 bg-gray-50' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <FlagIcon code={l.code} />
                  <span>{l.nativeName}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-brand shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
