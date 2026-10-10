/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        paper: 'var(--paper)',
        'paper-2': 'var(--paper-2)',
        card: 'var(--card)',
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        hairline: 'var(--hairline)',
        moss: {
          50: '#F4F7EE',
          100: 'var(--moss-100)',
          200: '#D2E0BD',
          300: '#B4CBA0',
          400: '#94B37F',
          500: 'var(--moss-500)',
          600: 'var(--moss-600)',
          700: '#3D552C',
          800: '#2D3F20',
          900: '#1D2A15',
          950: '#10170B',
        },
        teal: {
          700: 'var(--teal-700)',
        },
        gold: {
          400: 'var(--gold-400)',
        },
        // Event tokens
        event: {
          med: {
            text: 'var(--event-med-text)',
            bg: 'var(--event-med-bg)',
          },
          lab: {
            text: 'var(--event-lab-text)',
            bg: 'var(--event-lab-bg)',
          },
          cond: {
            text: 'var(--event-cond-text)',
            bg: 'var(--event-cond-bg)',
          },
          enc: {
            text: 'var(--event-enc-text)',
            bg: 'var(--event-enc-bg)',
          },
        },
      },
      borderRadius: {
        '28': '28px',
        '20': '20px',
      },
      boxShadow: {
        'soft': '0 8px 30px rgba(0, 0, 0, 0.04)',
        'glass': '0 8px 32px 0 rgba(15, 23, 18, 0.12)',
        'elevated': '0 12px 40px -10px rgba(29, 42, 34, 0.08)',
      },
    },
  },
  plugins: [],
}
