// jest.polyfill.ts
Object.defineProperty(global, 'import.meta', {
  value: {
    env: {
      VITE_API_URL: 'http://localhost:3000',
    },
  },
  writable: true,
});
