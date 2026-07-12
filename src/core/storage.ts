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

/**
 * Read + JSON-parse a persisted value, falling back on any failure.
 *
 * @param validate optional type guard; when it rejects the parsed value (e.g.
 *   corrupted or tampered storage, or a shape from an older schema), the
 *   `fallback` is returned instead of letting malformed data poison runtime
 *   state. Callers persisting non-trivial shapes (arrays/objects/enums) should
 *   pass one.
 */
export function loadLS<T>(key: string, fallback: T, validate?: (v: unknown) => v is T): T {
  try {
    const raw = _storage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (validate && !validate(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function saveLS<T>(key: string, value: T): boolean {
  try {
    _storage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    // Surface quota-exceeded errors via console so callers can act on return value
    if (e instanceof DOMException && (e.name === "QuotaExceededError" || e.code === 22)) {
      console.warn(`[storage] QuotaExceeded writing key "${key}"`);
    }
    return false;
  }
}

/** Remove a persisted key via the storage adapter (never throws). */
export function removeLS(key: string): void {
  try {
    _storage.removeItem(key);
  } catch {
    /* ignore — storage unavailable */
  }
}
