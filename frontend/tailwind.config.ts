import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        // FANOS AI Design System
        'fanos-bg':        '#080e1a',
        'fanos-surface':   '#0d1525',
        'fanos-card':      '#111c2e',
        'fanos-card-hover':'#162236',
        'fanos-border':    'rgba(0,210,255,0.09)',
        'fanos-accent':    '#00c8ff',
        'fanos-green':     '#00e5a0',
        'fanos-amber':     '#f59e0b',
        'fanos-orange':    '#f97316',
        'fanos-red':       '#ef4444',
        'fanos-purple':    '#8b5cf6',
        'fanos-text':      '#e8f0fe',
        'fanos-muted':     '#8fa3bf',
        'fanos-dim':       '#4a6080',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0,229,160,0.4)' },
          '50%':       { boxShadow: '0 0 0 5px rgba(0,229,160,0)' },
        },
        'pulse-accent': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0,200,255,0.4)' },
          '50%':       { boxShadow: '0 0 0 5px rgba(0,200,255,0)' },
        },
        'pulse-red': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0.4)' },
          '50%':       { boxShadow: '0 0 0 5px rgba(239,68,68,0)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(-6px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'pulse-glow':   'pulse-glow 2s infinite',
        'pulse-accent': 'pulse-accent 2s infinite',
        'pulse-red':    'pulse-red 2s infinite',
        'fade-in':      'fade-in 0.3s ease',
        'slide-in':     'slide-in 0.25s ease',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
