// Minimal mock for React Native NativeModules used by jest-expo.
// Ensures UIManager exists so Object.defineProperty calls in the preset do not fail.
const NativeModules = {
  UIManager: {},
};

module.exports = {
  __esModule: true,
  default: NativeModules,
};
