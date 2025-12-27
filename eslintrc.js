module.exports = {
  root: true,
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  rules: {
    "@typescript-eslint/no-unused-vars": "error",
    "import/no-unresolved": "error",
  },
  settings: {
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
        // Use multiple project references to support all packages
        project: [
          "./tsconfig.json",
          "./apps/desktop/tsconfig.json",
          "./apps/mobile/tsconfig.json",
          "./packages/*/tsconfig.json",
        ],
      },
    },
  },
  ignorePatterns: ["vite.config.ts", "dist", "node_modules", "*.js"],
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
};
