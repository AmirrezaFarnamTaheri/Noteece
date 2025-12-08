module.exports = {
  extends: ['expo', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/no-wrapper-object-types': 'off',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-undef': 'off',
    'import/no-unresolved': [
      'error',
      {
        ignore: [
          '^@expo/vector-icons',
          '^expo-',
          '^@testing-library/',
          '^@tauri-apps/',
          '^@jest/globals$',
          '^i18next$',
          '^react-i18next$',
          '^uuid$',
        ],
      },
    ],
    'import/namespace': 'off',
    'react-hooks/exhaustive-deps': 'warn',
  },
};
