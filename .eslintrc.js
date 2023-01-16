module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  plugins: ["solid"],
  extends: [
    "airbnb-base",
    "airbnb-typescript/base",
    "plugin:solid/typescript",
    "prettier",
  ],
  overrides: [],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
  },
  rules: {},
};
