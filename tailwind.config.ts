import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif']
      },
      colors: {
        card: {
          light: '#ffffff',
          dark: '#0f172a'
        },
        background: {
          light: '#e9f3ff',
          dark: '#0b1220'
        },
        primary: {
          DEFAULT: '#0ea5e9',
          dark: '#38bdf8'
        }
      },
      boxShadow: {
        soft: '0 10px 30px rgba(2, 6, 23, 0.10)',
        softDark: '0 10px 30px rgba(0,0,0,0.45)'
      },
      borderRadius: {
        card: '20px'
      }
    }
  },
  plugins: [],
}
export default config
