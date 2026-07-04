/**
 * In-memory fake of the File System Access API (directories, files, writable
 * streams, permission prompts). Reused across backup-target tests so we don't
 * re-implement a fake per file.
 */

export type PermissionState = "granted" | "denied" | "prompt";

export interface FakeDirectory {
  /** The handle to hand to production code (shaped like FileSystemDirectoryHandle). */
  handle: FileSystemDirectoryHandle;
  /** Child directories by name (for assertions). */
  dirs: Map<string, FakeDirectory>;
  /** Files by name → text (for assertions). */
  files: Map<string, { text: string; lastModified: number }>;
  setPermission(state: PermissionState): void;
  readonly permissionRequests: number;
}

export function createFakeDirectory(name = "root", initialPermission: PermissionState = "granted"): FakeDirectory {
  const dirs = new Map<string, FakeDirectory>();
  const files = new Map<string, { text: string; lastModified: number }>();
  let permission = initialPermission;
  let permissionRequests = 0;

  const handle = {
    name,
    kind: "directory" as const,

    async getDirectoryHandle(childName: string, opts?: { create?: boolean }): Promise<FileSystemDirectoryHandle> {
      const existing = dirs.get(childName);
      if (existing) return existing.handle;
      if (!opts?.create) throw new DOMException(`${childName} not found`, "NotFoundError");
      const child = createFakeDirectory(childName, permission);
      dirs.set(childName, child);
      return child.handle;
    },

    async getFileHandle(fileName: string, opts?: { create?: boolean }): Promise<FileSystemFileHandle> {
      if (!files.has(fileName)) {
        if (!opts?.create) throw new DOMException(`${fileName} not found`, "NotFoundError");
        files.set(fileName, { text: "", lastModified: Date.now() });
      }
      return {
        name: fileName,
        kind: "file" as const,
        async createWritable() {
          let buffer = "";
          return {
            async write(chunk: string) { buffer += chunk; },
            async close() { files.set(fileName, { text: buffer, lastModified: Date.now() }); },
          } as unknown as FileSystemWritableFileStream;
        },
        async getFile() {
          const record = files.get(fileName)!;
          return { text: async () => record.text, lastModified: record.lastModified } as unknown as File;
        },
      } as unknown as FileSystemFileHandle;
    },

    async queryPermission() { return permission; },
    async requestPermission() {
      permissionRequests += 1;
      if (permission === "prompt") permission = "granted";
      return permission;
    },
  };

  return {
    handle: handle as unknown as FileSystemDirectoryHandle,
    dirs,
    files,
    setPermission: (state) => { permission = state; },
    get permissionRequests() { return permissionRequests; },
  };
}
