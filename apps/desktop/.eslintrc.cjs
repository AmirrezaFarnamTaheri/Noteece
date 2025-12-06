module.exports = {
  extends: [
    '../../eslintrc.js',
    'plugin:react-hooks/recommended',
    'plugin:security/recommended',
    'plugin:unicorn/recommended',
  ],
  plugins: ['react-hooks', 'security', 'unicorn'],
  rules: {
    'react-hooks/exhaustive-deps': 'warn',
    'security/detect-object-injection': 'off',
    'unicorn/prevent-abbreviations': 'off',
    'unicorn/filename-case': 'off',
    'unicorn/no-null': 'off',
    'unicorn/prefer-module': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
};
