/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0d1017",
        purple: {
          50: "#c8aad4",
          100: "#c49acf",
          200: "#bf80c8",
          300: "#bb69c0",
          400: "#b556b4",
          500: "#aa4bae",
          600: "#9840a0",
          700: "#7f348b",
          800: "#60286e",
          900: "#401c4c",
        },
      },
    },
  },
  plugins: [],
};
