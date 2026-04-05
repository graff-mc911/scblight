export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff8f0',
          100: '#ffedd5',
          200: '#ffd9aa',
          300: '#ffbb77',
          400: '#ff9c44',
          500: '#FF7A00',
          600: '#E66D00',
          700: '#CC6100',
          800: '#B35400',
          900: '#994800',
        },
        brand: {
          orange: '#FF7A00',
          anthracite: '#2B2B2B',
          white: '#FFFFFF',
          gray: '#F5F5F5',
          darkGray: '#4A4A4A',
        },
        dark: {
          50: '#F9FAFB',
          100: '#D1D5DB',
          200: '#9CA3AF',
          300: '#6B7280',
          400: '#4B5563',
          500: '#374151',
          600: '#3E4651',
          700: '#1F2937',
          800: '#111827',
          900: '#0F172A',
        },
        success: {
          500: '#10B981',
          600: '#059669',
        },
        warning: {
          500: '#F59E0B',
          600: '#D97706',
        },
        danger: {
          500: '#EF4444',
          600: '#DC2626',
        },
        info: {
          500: '#3B82F6',
          600: '#2563EB',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tight: '-0.02em',
        tighter: '-0.04em',
      },
      boxShadow: {
        'premium': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'premium-lg': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'orange': '0 4px 12px rgba(255, 122, 0, 0.3)',
      },
    },
  },
  plugins: [],
}
