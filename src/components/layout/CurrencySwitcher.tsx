'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useCurrency } from '@/components/currency/CurrencyProvider';
import { SUPPORTED_CURRENCIES } from '@/lib/currency/config';

interface CurrencySwitcherProps {
  variant?: 'header' | 'mobile';
  className?: string;
}

export function CurrencySwitcher({ variant = 'header', className = '' }: CurrencySwitcherProps) {
  const { currency, setCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  // Close on outside click
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

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
        const currentIndex = SUPPORTED_CURRENCIES.findIndex((c) => c.code === currency);
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
        setFocusedIndex((prev) => (prev + 1) % SUPPORTED_CURRENCIES.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + SUPPORTED_CURRENCIES.length) % SUPPORTED_CURRENCIES.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < SUPPORTED_CURRENCIES.length) {
          setCurrency(SUPPORTED_CURRENCIES[focusedIndex].code);
          setIsOpen(false);
          buttonRef.current?.focus();
        }
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const currentConfig = SUPPORTED_CURRENCIES.find((c) => c.code === currency) || SUPPORTED_CURRENCIES[0];

  if (variant === 'mobile') {
    return (
      <div className={`space-y-1 ${className}`}>
        <label htmlFor="mobile-currency-select" className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
          Currency
        </label>
        <select
          id="mobile-currency-select"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 text-xs font-medium text-gray-800 focus:outline-none focus:border-brand"
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} - {c.symbol} - {c.name}
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
        id="currency-switcher-btn"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={`Select currency, current currency is ${currency}`}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 hover:text-brand transition-colors font-medium text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-xs px-1 py-0.5"
      >
        <span>
          {currentConfig.code} ({currentConfig.symbol})
        </span>
        <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Supported currencies"
          className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-gray-200 rounded-md shadow-xl z-50 py-1 text-xs focus:outline-none max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
        >
          {SUPPORTED_CURRENCIES.map((c, index) => {
            const isSelected = c.code === currency;
            const isFocused = index === focusedIndex;
            return (
              <li
                key={c.code}
                id={`currency-opt-${c.code}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setCurrency(c.code);
                  setIsOpen(false);
                  buttonRef.current?.focus();
                }}
                onMouseEnter={() => setFocusedIndex(index)}
                className={`w-full flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                  isSelected ? 'bg-orange-50/70 text-brand font-bold' : 'text-gray-700 hover:bg-gray-100'
                } ${isFocused ? 'ring-1 ring-inset ring-brand/30 bg-gray-50' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold w-9">{c.code}</span>
                  <span className="text-gray-400 font-mono">({c.symbol})</span>
                  <span className="text-gray-600 truncate max-w-[110px]">{c.name}</span>
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
