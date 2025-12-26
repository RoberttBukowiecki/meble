import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

// Polyfill TextEncoder/TextDecoder for test environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Polyfill crypto.randomUUID for test environment
// @ts-ignore
if (typeof global.crypto === "undefined") {
  // @ts-ignore
  global.crypto = {};
}
// @ts-ignore
if (typeof global.crypto.randomUUID !== "function") {
  // @ts-ignore
  global.crypto.randomUUID = () => "test-uuid";
}

// Mock ResizeObserver for Radix UI components
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver;

// Mock window.matchMedia for responsive components
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock HTMLElement scrollIntoView
HTMLElement.prototype.scrollIntoView = jest.fn();
