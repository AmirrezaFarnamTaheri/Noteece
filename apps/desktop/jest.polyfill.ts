// Polyfill for import.meta in Jest without shadowing dynamic import()
// Prefer a safe, explicit global to avoid clobbering native behavior.
const importMetaPolyfill = {
  env: {
    DEV: true,
    PROD: false,
  },
};

// Attach to a non-conflicting global
Object.defineProperty(globalThis as any, 'importMeta', {
  value: importMetaPolyfill,
  writable: false,
  configurable: true,
  enumerable: true,
});

// If some code checks `import.meta`, provide it only when not already defined and without overriding a function
try {
  const currentImport = (globalThis as any).import;
  if (currentImport && typeof currentImport === 'function' && !('meta' in currentImport)) {
    Object.defineProperty(currentImport, 'meta', {
      value: importMetaPolyfill,
      writable: false,
      configurable: true,
      enumerable: true,
    });
  }
} catch {
  // Ignore if environment doesn't allow touching globalThis.import
}

// Basic ResizeObserver polyfill for Mantine components in Jest/jsdom
if (typeof (globalThis as any).ResizeObserver === 'undefined') {
  class ResizeObserver {
    callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe(_target: Element) {
      // No-op in tests
    }

    unobserve(_target: Element) {
      // No-op in tests
    }

    disconnect() {
      // No-op in tests
    }
  }

  (globalThis as any).ResizeObserver = ResizeObserver;
}
