/* eslint-disable @typescript-eslint/ban-ts-comment */
// jest-pre-setup.js
// import 'react-native-gesture-handler/jest-setup';
import { jest } from '@jest/globals';

// Silence the warning: Animated: `useNativeDriver` is not supported because the native animated module is missing
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock ResizeObserver
if (typeof window !== 'undefined' && typeof window.ResizeObserver === 'undefined') {
  // @ts-ignore
  window.ResizeObserver = jest.fn(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
}

const originalDefineProperty = Object.defineProperty;
let isDefining = false;

function safeDefineProperty(obj, prop, descriptor) {
  if (isDefining) return obj;
  try {
    if (obj === null || obj === undefined || (typeof obj !== 'object' && typeof obj !== 'function')) {
      return obj;
    }
    isDefining = true;
    return originalDefineProperty.call(Object, obj, prop, descriptor);
  } catch (_error) {
    return obj;
  } finally {
    isDefining = false;
  }
}

// Export the helper for modules that need it
module.exports.safeDefineProperty = safeDefineProperty;


// Mock for async storage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock for nanoid
jest.mock('nanoid', () => ({
  nanoid: () => 'test-id',
}));

// Mock for tauri-apps
jest.mock('@tauri-apps/api/fs', () => ({
  readTextFile: jest.fn(),
  writeTextFile: jest.fn(),
  exists: jest.fn(),
  createDir: jest.fn(),
  removeDir: jest.fn(),
}));

// Mock crypto if needed
if (typeof global.crypto === 'undefined') {
  // @ts-ignore
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
        arr[i] = (Math.random() * 256) & 0xff;
      }
      return arr;
    },
    // Minimal subtle stub to satisfy existence checks
    subtle: {
      digest: async () => {
        throw new Error('crypto.subtle.digest is not implemented in test environment');
      },
      generateKey: async () => {
        throw new Error('crypto.subtle.generateKey is not implemented in test environment');
      },
      importKey: async () => {
        throw new Error('crypto.subtle.importKey is not implemented in test environment');
      },
      encrypt: async () => {
        throw new Error('crypto.subtle.encrypt is not implemented in test environment');
      },
      decrypt: async () => {
        throw new Error('crypto.subtle.decrypt is not implemented in test environment');
      },
    },
  };
}

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    // @ts-ignore
    ...Object.keys(require('@expo/vector-icons/build/Icons')).reduce((acc, name) => {
      // @ts-ignore
      acc[name] = (props) => <View {...props} />;
      return acc;
    }, {}),
  };
});

if (typeof global.requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
}
