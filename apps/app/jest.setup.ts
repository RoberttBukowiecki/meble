import '@testing-library/jest-dom';

// Polyfill crypto.randomUUID for test environment
// @ts-ignore
if (typeof global.crypto === 'undefined') {
  // @ts-ignore
  global.crypto = {};
}
// @ts-ignore
if (typeof global.crypto.randomUUID !== 'function') {
  // @ts-ignore
  global.crypto.randomUUID = () => 'test-uuid';
}
