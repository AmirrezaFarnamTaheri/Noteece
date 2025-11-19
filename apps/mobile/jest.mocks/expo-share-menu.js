module.exports = {
  addShareListener: jest.fn(() => ({ remove: jest.fn() })),
  getInitialShare: jest.fn().mockResolvedValue(null),
};
