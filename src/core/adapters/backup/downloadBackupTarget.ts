import type { BackupRecord, BackupTargetPort, BackupWriteResult } from "../../ports/BackupTargetPort";

function datedFilename(): string {
  const stamp = new Date().toISOString().slice(0, 10);
  // Flat name: browsers sanitize path separators in the download attribute
  // (Chrome turns "Roamwise/" into "Roamwise_"), so a real subfolder isn't
  // possible here — only the filesystem/OPFS targets create the Roamwise dir.
  return `roamwise-backup-${stamp}.json`;
}

/**
 * Fallback target for browsers without persistent storage APIs. Writes a dated
 * JSON into the browser's Downloads folder (findable there), but cannot read it
 * back, so auto-import is unavailable on this target.
 */
export const downloadBackupTarget: BackupTargetPort = {
  kind: "download",

  async isReady(): Promise<boolean> {
    return typeof document !== "undefined";
  },

  async configure(): Promise<boolean> {
    return true;
  },

  async write(text: string): Promise<BackupWriteResult> {
    if (typeof document === "undefined") return { ok: false, location: "", reason: "no-dom" };
    const name = datedFilename();
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    try {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = name;
      anchor.rel = "noopener";
      anchor.click();
      return { ok: true, location: `Downloads / ${name}` };
    } finally {
      URL.revokeObjectURL(url);
    }
  },

  async readLatest(): Promise<BackupRecord | null> {
    return null; // the Downloads folder is not readable from the browser
  },

  async location(): Promise<string> {
    return "Browser Downloads folder";
  },
};
