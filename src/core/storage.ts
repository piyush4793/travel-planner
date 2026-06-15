import type { StoragePort } from "./ports/StoragePort";
import { webStorageAdapter } from "./adapters/WebStorageAdapter";

// Singleton — can be swapped for testing or React Native
let _storage: StoragePort = webStorageAdapter;

/** @public Swap storage backend (e.g. AsyncStorage for React Native) */
export function setStorageAdapter(adapter: StoragePort): void {
  _storage = adapter;
}

/** @public Get the current storage adapter */
export function getStorageAdapter(): StoragePort {
  return _storage;
}

export function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = _storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveLS<T>(key: string, value: T): void {
  try {
    _storage.setItem(key, JSON.stringify(value));
  } catch {}
}
