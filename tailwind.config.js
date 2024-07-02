/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./web/**/*.{html,tsx}'],
  theme: {
    fontFamily: {
      clash: 'ClashDisplay-Regular, sans-serif',
      ['clash-semibold']: 'ClashDisplay-Medium, sans-serif',
      ['clash-bold']: 'ClashDisplay-Semibold, sans-serif',
    },
    extend: {
      backgroundImage: {
        'model-backdrop': "url('/web/asset/aifans/model-backdrop.png')",
        'home-hero-mobile': "url('/static/images/Header1.png')",
        'home-hero-desktop': "url('/static/images/hero-bg1.png')",
        'home-hero-shadow': "url('/static/images/shadow.png')",
      },
      boxShadow: {
        hero: '0px 0px 10px 0px rgba(0, 0, 0, 0.60)',
      },
      // screens: {
      //   xs: '768px',
      //   sm: '1024px',
      // },
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
        cosplay: {
          blue: {
            100: '#10E0F9',
            200: '#4A72FF',
          },
          gray: {
            100: '#949494',
            900: '#1e1f22',
          },
          pink: {
            100: '#FF23FF',
            200: '#FF00B8',
          },
          purple: '#B14DFF',
          red: '#E12F42',
        },
      },
      fontSize: {
        xxs: '0.625rem',
      },
    },
  },
  plugins: [],
}
