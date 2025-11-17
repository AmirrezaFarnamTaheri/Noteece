// Minimal stub for Expo async-require messageSocket used by jest-expo.
// Newer Expo SDKs provide this module, but on Expo 50 it does not exist.
// We only need it to be resolvable in tests; jest-expo immediately mocks it.

module.exports = {
  connect() {
    // no-op
  },
  disconnect() {
    // no-op
  },
};

