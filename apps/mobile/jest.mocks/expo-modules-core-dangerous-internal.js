// Minimal stub for expo-modules-core's internal polyfill used by jest-expo.
// It must provide the same global registry shape consumed during preset setup.
function ensureExpoGlobal() {
  if (typeof globalThis.expo !== 'object' || globalThis.expo === null) {
    globalThis.expo = {};
  }

  if (!globalThis.expo.modules || typeof globalThis.expo.modules !== 'object') {
    globalThis.expo.modules = {};
  }

  if (!globalThis.expo.EventEmitter) {
    class EventEmitter {}
    globalThis.expo.EventEmitter = EventEmitter;
  }

  if (!globalThis.expo.NativeModule) {
    class NativeModule {}
    globalThis.expo.NativeModule = NativeModule;
  }

  if (!globalThis.expo.SharedObject) {
    class SharedObject {}
    globalThis.expo.SharedObject = SharedObject;
  }
}

module.exports = {
  installExpoGlobalPolyfill() {
    ensureExpoGlobal();
  },
};
