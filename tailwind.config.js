/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./web/**/*.{html,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '768px',
        sm: '1024px',
      },
      colors: {
        background: '#090b10',
        'background-lighter': '#0d1017',
        purple: {
          50: '#c8aad4',
          100: '#c49acf',
          200: '#bf80c8',
          300: '#bb69c0',
          400: '#b556b4',
          500: '#aa4bae',
          600: '#9840a0',
          700: '#7f348b',
          800: '#60286e',
          900: '#401c4c',
        },
      },
    },
  },
  plugins: [],
}
