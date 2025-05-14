/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4f9',
          100: '#dfe8f3',
          200: '#c0d1e7',
          300: '#92afd6',
          400: '#6886c1',
          500: '#4b67af',
          600: '#334f93',
          700: '#263c76',
          800: '#1e325e',
          900: '#1b2c4f',
          950: '#0f1a2f',
        },
        secondary: {
          50: '#f5f7fa',
          100: '#ebeef5',
          200: '#d8dfe9',
          300: '#b9c5d8',
          400: '#94a3c1',
          500: '#7686ac',
          600: '#5f6c91',
          700: '#4d5876',
          800: '#424a63',
          900: '#394053',
          950: '#232736',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
      },
      keyframes: {
        scan: {
          '0%': { top: '0%' },
          '50%': { top: '100%' },
          '100%': { top: '0%' },
        },
        'scan-vertical': {
          '0%': { left: '0%' },
          '50%': { left: '100%' },
          '100%': { left: '0%' },
        },
        radar: {
          '0%': { transform: 'scale(0.5)', opacity: '0.8' },
          '50%': { transform: 'scale(1.5)', opacity: '0.4' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        progress: {
          '0%': { width: '0%' },
          '50%': { width: '60%' },
          '75%': { width: '75%' },
          '90%': { width: '90%' },
          '100%': { width: '100%' },
        },
        typewriter: {
          '0%': { width: '0%', opacity: '0' },
          '1%': { opacity: '1' },
          '100%': { width: '100%', opacity: '1' },
        },
        'processing-step-1': {
          '0%, 30%': { opacity: '1' },
          '33%, 100%': { opacity: '0' },
        },
        'processing-step-1-complete': {
          '0%, 30%': { opacity: '0', display: 'none' },
          '33%, 100%': { opacity: '1', display: 'block' },
        },
        'processing-step-2-waiting': {
          '0%, 30%': { opacity: '1' },
          '33%, 100%': { opacity: '0' },
        },
        'processing-step-2': {
          '0%, 30%': { opacity: '0' },
          '33%, 63%': { opacity: '1' },
          '66%, 100%': { opacity: '0' },
        },
        'processing-step-2-complete': {
          '0%, 63%': { opacity: '0', display: 'none' },
          '66%, 100%': { opacity: '1', display: 'block' },
        },
        'processing-step-3-waiting': {
          '0%, 63%': { opacity: '1' },
          '66%, 100%': { opacity: '0' },
        },
        'processing-step-3': {
          '0%, 63%': { opacity: '0' },
          '66%, 98%': { opacity: '1' },
          '99%, 100%': { opacity: '0' },
        },
        'processing-step-3-complete': {
          '0%, 98%': { opacity: '0', display: 'none' },
          '99%, 100%': { opacity: '1', display: 'block' },
        },
        pulse: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeOut: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(10px)' }
        },
      },
      animation: {
        scan: 'scan 3s ease-in-out infinite',
        'scan-vertical': 'scan-vertical 4s ease-in-out infinite',
        radar: 'radar 3s ease-out infinite',
        progress: 'progress 6s ease-in-out',
        typewriter: 'typewriter 2s steps(40, end)',
        'processing-step-1': 'processing-step-1 12s forwards',
        'processing-step-1-complete': 'processing-step-1-complete 12s forwards',
        'processing-step-2-waiting': 'processing-step-2-waiting 12s forwards',
        'processing-step-2': 'processing-step-2 12s forwards',
        'processing-step-2-complete': 'processing-step-2-complete 12s forwards',
        'processing-step-3-waiting': 'processing-step-3-waiting 12s forwards',
        'processing-step-3': 'processing-step-3 12s forwards',
        'processing-step-3-complete': 'processing-step-3-complete 12s forwards',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2s linear infinite',
        fadeIn: 'fadeIn 0.5s ease-out forwards',
        fadeOut: 'fadeOut 0.5s ease-in forwards',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid': 'linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '20px 20px',
      },
      scale: {
        '102': '1.02',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
