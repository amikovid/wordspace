/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"EB Garamond"', 'Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        // Warm umber / candlelit study palette
        umber: {
          950: '#0d0805',
          900: '#1a0f08',
          800: '#241710',
          700: '#2f1f16',
          600: '#3d2a1d',
        },
        ember: {
          50:  '#fff7e8',
          100: '#fbe9c3',
          200: '#f5d68f',
          300: '#f0c465',
          400: '#e8a942',
          500: '#d18a2a', // amber star core
          600: '#a96a1c',
        },
        copper: {
          400: '#d4a55a',
          500: '#c9a14a', // connection line
          600: '#a98232',
        },
        parchment: {
          50:  '#faf3e5',
          100: '#f4ead0',
          200: '#e9d8a8',
        },
      },
    },
  },
  plugins: [],
}
