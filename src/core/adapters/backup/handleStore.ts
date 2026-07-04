/**
 * Persists a picked FileSystemDirectoryHandle in IndexedDB so the desktop backup
 * folder survives reloads (handles are structured-cloneable but not JSON-able,
 * so localStorage can't hold them).
 */

const DB_NAME = "roamwise";
const STORE = "handles";
const KEY = "backupDir";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const request = run(db.transaction(STORE, mode).objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
      }),
  );
}

export async function saveDirHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  await tx("readwrite", (s) => s.put(handle, KEY));
}

export async function loadDirHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const result = await tx<FileSystemDirectoryHandle | undefined>("readonly", (s) => s.get(KEY));
    return result ?? null;
  } catch {
    return null;
  }
}

export async function clearDirHandle(): Promise<void> {
  try {
    await tx("readwrite", (s) => s.delete(KEY));
  } catch {
    /* best-effort */
  }
}
