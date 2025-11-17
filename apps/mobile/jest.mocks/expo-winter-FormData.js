// Stub for Expo winter FormData helper used by jest-expo.
// The real implementation is only needed in native runtime, so in Jest we can no-op.
module.exports = {
  installFormDataPatch: () => {
    // no-op
  },
};
