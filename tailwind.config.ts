import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body:    ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#f0f7f8',
          100: '#d9ecef',
          200: '#b6d9de',
          300: '#85bec6',
          400: '#4e9ca8',
          500: '#33808d',
          600: '#2c6976',
          700: '#275761',
          800: '#254a52',
          900: '#0F2D35',
          950: '#091a1f',
        },
        amber: {
          50:  '#fffbeb',
          100: '#fef3c7',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#D97706',
          700: '#b45309',
        },
        surface: {
          '0': '#FAFAF8',
          '1': '#F4F1EC',
          '2': '#EDE9E3',
          '3': '#E5E0D8',
          '4': '#C8C3BA',
        },
      },
      boxShadow: {
        'sm':  '0 1px 2px rgba(15,45,53,0.04), 0 2px 6px rgba(15,45,53,0.04)',
        'md':  '0 4px 8px rgba(15,45,53,0.06), 0 8px 24px rgba(15,45,53,0.06)',
        'lg':  '0 8px 16px rgba(15,45,53,0.08), 0 24px 64px rgba(15,45,53,0.08)',
        'xl':  '0 16px 32px rgba(15,45,53,0.12), 0 48px 96px rgba(15,45,53,0.08)',
        'glow-brand':  '0 0 24px rgba(51,128,141,0.25)',
        'glow-amber':  '0 0 24px rgba(217,119,6,0.30)',
        'glow-vip':    '0 0 32px rgba(124,58,237,0.30)',
      },
      borderRadius: {
        'sm':  '6px',
        'md':  '12px',
        'lg':  '18px',
        'xl':  '24px',
        '2xl': '32px',
      },
      animation: {
        'fade-up':    'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in':    'fadeIn 0.5s cubic-bezier(0.16,1,0.3,1) both',
        'scale-in':   'scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
        'shimmer':    'shimmer 1.6s linear infinite',
        'spin-slow':  'spin 3s linear infinite',
        'pulse-soft': 'pulseSoft 2.5s ease-in-out infinite',
        'float':      'float 4s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
      },
      transitionTimingFunction: {
        'out-expo':    'cubic-bezier(0.16, 1, 0.3, 1)',
        'elastic':     'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'in-out-expo': 'cubic-bezier(0.76, 0, 0.24, 1)',
      },
    },
  },
  plugins: [],
}

export default config