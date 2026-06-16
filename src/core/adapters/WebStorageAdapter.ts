import type { StoragePort } from "../ports/StoragePort";

/** localStorage-backed implementation for web — guarded against quota/private-mode errors */
export const webStorageAdapter: StoragePort = {
  getItem: (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem: (key, value) => {
    try { localStorage.setItem(key, value); } catch { /* quota or private-mode */ }
  },
  removeItem: (key) => {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};
