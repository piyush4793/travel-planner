import "@testing-library/jest-dom";
import { afterEach, beforeEach, vi } from "vitest";

// Mock localStorage for tests
const store: Record<string, string> = {};
const localStorageMock: Storage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// jsdom lacks matchMedia; default to the desktop breakpoint so components using
// useBreakpoint render without crashing. Tests that need a specific breakpoint
// mock useBreakpoint directly.
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Clear localStorage between tests
beforeEach(() => {
  localStorageMock.clear();
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  vi.useRealTimers();
});
