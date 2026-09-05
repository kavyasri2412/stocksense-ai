/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          light: '#f9fafb',
          DEFAULT: '#f4f4f5',
          dark: '#09090b',
        },
        surface: {
          light: '#ffffff',
          DEFAULT: '#18181b',
          dark: '#121215',
          border: '#27272a',
          'border-light': '#e4e4e7',
          subtle: '#27272a',
          'subtle-light': '#f4f4f5'
        },
        charcoal: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#090d16',
        },
        neutralzinc: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
        status: {
          emerald: '#10b981',
          'emerald-bg': 'rgba(16, 185, 129, 0.12)',
          amber: '#f59e0b',
          'amber-bg': 'rgba(245, 158, 11, 0.12)',
          rose: '#ef4444',
          'rose-bg': 'rgba(239, 68, 68, 0.12)',
          zinc: '#71717a',
          'zinc-bg': 'rgba(113, 113, 122, 0.12)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'elevated': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
        'glow': '0 0 20px -5px rgba(24, 24, 27, 0.15)'
      }
    },
  },
  plugins: [],
}
