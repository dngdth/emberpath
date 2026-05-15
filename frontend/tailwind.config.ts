import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        safe: '#22c55e',
        danger: '#ef4444',
        panel: '#0f172a',
        surface: '#111827',
      },
      boxShadow: {
        soft: '0 18px 35px rgba(15, 23, 42, 0.18)',
      },
    },
  },
  plugins: [],
} satisfies Config;
