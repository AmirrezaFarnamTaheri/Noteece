// Minimal stub for expo-modules-core's internal polyfill used by jest-expo.
// Newer Expo SDKs expose this helper; on Expo 50 it may not exist.
// We just need to ensure that globalThis.expo with the required classes exists.
function ensureExpoGlobal() {
  if (typeof globalThis.expo !== 'object' || globalThis.expo === null) {
    globalThis.expo = {};
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
