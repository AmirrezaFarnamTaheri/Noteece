// Polyfill for import.meta in Jest
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        DEV: true,
        PROD: false,
      },
    },
  },
  writable: true,
  configurable: true,
});
