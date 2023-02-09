module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  plugins: ["solid", "tailwindcss"],
  extends: [
    "airbnb-base",
    "airbnb-typescript/base",
    "plugin:solid/typescript",
    "plugin:tailwindcss/recommended",
    "prettier",
  ],
  overrides: [],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
  },
  rules: {
    "@typescript-eslint/explicit-module-boundary-types": "error",
    "import/extensions": ["error", "never"],
    "tailwindcss/no-custom-classname": "off",
  },
};
