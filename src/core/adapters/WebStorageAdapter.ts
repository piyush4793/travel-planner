import type { StoragePort } from "../ports/StoragePort";

/** localStorage-backed implementation for web */
export const webStorageAdapter: StoragePort = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};
