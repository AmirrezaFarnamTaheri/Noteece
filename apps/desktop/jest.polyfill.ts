// Polyfill for import.meta in Jest without shadowing dynamic import()
// Prefer a safe, explicit global to avoid clobbering native behavior.
const importMetaPolyfill = {
  env: {
    DEV: true,
    PROD: false,
  },
};

// Attach to a non-conflicting global
type GlobalWithImportMeta = typeof globalThis & {
  importMeta?: typeof importMetaPolyfill;
};

const globalWithImportMeta = globalThis as GlobalWithImportMeta;

Object.defineProperty(globalWithImportMeta, 'importMeta', {
  value: importMetaPolyfill,
  writable: false,
  configurable: true,
  enumerable: true,
});

// If some code checks `import.meta`, provide it only when not already defined and without overriding a function
try {
  const currentImport = (globalThis as typeof globalThis & { import?: unknown }).import;
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
type GlobalWithResizeObserver = typeof globalThis & {
  ResizeObserver?: typeof ResizeObserver;
};

const globalWithResizeObserver = globalThis as GlobalWithResizeObserver;

if (globalWithResizeObserver.ResizeObserver === undefined) {
  class ResizeObserver {
    observe(_target: Element): void {
      // No-op in tests
    }

    unobserve(_target: Element): void {
      // No-op in tests
    }

    disconnect(): void {
      // No-op in tests
    }
  }

  globalWithResizeObserver.ResizeObserver = ResizeObserver;
}
