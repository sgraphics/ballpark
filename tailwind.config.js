/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['Montserrat', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        bp: {
          white: '#FFFFFF',
          black: '#0A0A0A',
          dark: '#141414',
          panel: '#1A1A1A',
          muted: '#6B7280',
          'muted-light': '#9CA3AF',
          border: '#E5E7EB',
          'border-dark': '#2A2A2A',
          buyer: '#2563EB',
          'buyer-soft': '#DBEAFE',
          seller: '#EA580C',
          'seller-soft': '#FFF7ED',
          system: '#6B7280',
          'system-soft': '#F3F4F6',
          human: '#0A0A0A',
          'human-soft': '#F9FAFB',
          success: '#059669',
          'success-soft': '#D1FAE5',
          warning: '#D97706',
          'warning-soft': '#FEF3C7',
          error: '#DC2626',
          'error-soft': '#FEE2E2',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-in': 'bounceIn 0.4s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
