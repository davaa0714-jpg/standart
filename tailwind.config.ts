import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      colors: {
        bg:       '#0d1117',
        surface:  '#161b22',
        surface2: '#1c2128',
        surface3: '#21262d',
        border:   '#30363d',
        border2:  '#3d444d',
        tx:       '#e6edf3',
        tx2:      '#8b949e',
        tx3:      '#6e7681',
        accent:   { DEFAULT: '#2ea043', light: '#3fb950' },
        primary:  { DEFAULT: '#1f6feb', light: '#388bfd' },
        warn:     { DEFAULT: '#d29922', light: '#e3b341' },
        danger:   { DEFAULT: '#da3633', light: '#f85149' },
        purple:   { DEFAULT: '#8957e5', light: '#a371f7' },
        cyan:     { DEFAULT: '#1b6f7c', light: '#39c5cf' },
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        lg: '10px',
        xl: '14px',
      },
      boxShadow: {
        card: '0 8px 24px rgba(1,4,9,0.4)',
        modal: '0 16px 48px rgba(1,4,9,0.6)',
      },
    },
  },
  plugins: [],
}

export default config
