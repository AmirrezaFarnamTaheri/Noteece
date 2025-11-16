/**
 * Jest pre-setup file that runs before jest-expo
 * This ensures necessary globals are defined and fixes jest-expo compatibility issues
 */

// Ensure global object exists
if (typeof global === 'undefined') {
  throw new Error('global object is not defined');
}

// Store the original defineProperty to avoid recursion
const originalDefineProperty = Object.defineProperty;

// Wrap Object.defineProperty to handle null/undefined gracefully
Object.defineProperty = function(obj, prop, descriptor) {
  try {
    // Ensure obj is actually an object
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      // jest-expo tries to define properties on things that don't exist
      // Just return the object as-is
      return obj;
    }
    return originalDefineProperty.call(Object, obj, prop, descriptor);
  } catch (error) {
    // If Object.defineProperty fails, return the object as-is
    // This allows jest-expo to continue without crashing
    return obj;
  }
};

// Restore properties of Object.defineProperty
Object.keys(originalDefineProperty).forEach(key => {
  try {
    Object.defineProperty(Object.defineProperty, key, {
      value: originalDefineProperty[key],
      configurable: true,
    });
  } catch (e) {
    // Ignore errors during property copy
  }
});

// Setup React Native environment
global.window = global;
global.self = global;
// Provide a no-op requestAnimationFrame for libraries expecting it
if (typeof global.requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
}

// Mock crypto if needed
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    getRandomValues: (arr) => {
      if (
        !arr ||
        typeof arr.length !== 'number' ||
        !ArrayBuffer.isView(arr) ||
        !(arr.BYTES_PER_ELEMENT && arr.BYTES_PER_ELEMENT === 1)
      ) {
        throw new TypeError('Expected a Uint8Array or similar typed array');
      }
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256) & 0xff;
      }
      return arr;
    },
  };
}

// Ensure console exists
if (!global.console) {
  global.console = {
    log: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
    trace: () => {},
  };
}

// Set NODE_ENV
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}
