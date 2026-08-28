import '@testing-library/jest-dom';

// Polyfill global fetch if not present in jsdom
if (!globalThis.fetch) {
  globalThis.fetch = jest.fn();
}
