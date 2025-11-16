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

// Mock crypto if needed
if (typeof global.crypto === 'undefined') {
  global.crypto = {
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
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
