/**
 * Mock for react-hotkeys-hook
 */

module.exports = {
  useHotkeys: jest.fn((keys, callback, options) => {
    // Mock implementation that does nothing
    return {
      ref: { current: null }
    };
  }),
  HotkeysProvider: ({ children }) => children,
};