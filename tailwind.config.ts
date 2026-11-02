import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#00a99d',
          dark: '#008f85',
          light: '#e6f6f5',
          hover: '#009b90',
        },
        dark: {
          DEFAULT: '#222222',
          muted: '#666666',
          border: '#e9ecef',
          surface: '#f8f9fa',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Open Sans', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.12)',
        dropdown: '0 10px 30px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
};

export default config;
