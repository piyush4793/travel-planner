import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  getPlatformProfile: vi.fn(),
  getBackupTargetKind: vi.fn(),
  setBackupTargetKind: vi.fn(),
  backupToTarget: vi.fn(),
  restoreFromTarget: vi.fn(),
  configure: vi.fn(),
  forgetBackupFolder: vi.fn(),
}));

vi.mock("../../core/platform/platformProfile", () => ({
  getPlatformProfile: mocks.getPlatformProfile,
}));

vi.mock("../../core/platform/selectBackupTarget", () => ({
  allBackupTargets: () => [{ kind: "filesystem" }, { kind: "opfs" }, { kind: "download" }],
  getBackupTarget: (kind: string) => ({ location: async () => `location-of-${kind}` }),
}));

vi.mock("../../core/adapters/backup/fileSystemBackupTarget", () => ({
  fileSystemBackupTarget: { configure: mocks.configure },
  forgetBackupFolder: mocks.forgetBackupFolder,
}));

vi.mock("../../utils/backup", () => ({
  getBackupTargetKind: mocks.getBackupTargetKind,
  setBackupTargetKind: mocks.setBackupTargetKind,
  backupToTarget: mocks.backupToTarget,
  restoreFromTarget: mocks.restoreFromTarget,
}));

import StorageLocationCard from "../../components/ai/settings/StorageLocationCard";

describe("StorageLocationCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPlatformProfile.mockReturnValue({
      os: "macos", formFactor: "desktop", surface: "browser",
      capabilities: { fileSystemAccess: true, opfs: true, shareFiles: false, persistentStorage: true },
    });
    mocks.getBackupTargetKind.mockReturnValue("filesystem");
    mocks.backupToTarget.mockResolvedValue({ ok: true, location: "Backups/Roamwise" });
    mocks.restoreFromTarget.mockResolvedValue({ ok: true, msg: "Restored 3 items." });
    mocks.configure.mockResolvedValue(true);
  });

  it("shows the device summary and three location choices", async () => {
    render(<StorageLocationCard onStatus={vi.fn()} />);
    expect(screen.getByText("macOS · Desktop")).toBeTruthy();
    expect(screen.getByRole("radio", { name: /A folder you choose/i })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /App private storage/i })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /Browser Downloads/i })).toBeTruthy();
    await waitFor(() => expect(screen.getByText("location-of-filesystem")).toBeTruthy());
  });

  it("marks the active target and resolves its current location", async () => {
    render(<StorageLocationCard onStatus={vi.fn()} />);
    expect(screen.getByRole("radio", { name: /A folder you choose/i }).getAttribute("aria-checked")).toBe("true");
    await waitFor(() => expect(screen.getByText("location-of-filesystem")).toBeTruthy());
  });

  it("shows folder controls only for the filesystem target", async () => {
    render(<StorageLocationCard onStatus={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Change folder/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Forget folder/i })).toBeTruthy();
    await waitFor(() => expect(screen.getByText("location-of-filesystem")).toBeTruthy());
  });

  it("backs up on demand and reports status", async () => {
    const onStatus = vi.fn();
    render(<StorageLocationCard onStatus={onStatus} />);
    await userEvent.click(screen.getByRole("button", { name: /Back up now/i }));
    expect(mocks.backupToTarget).toHaveBeenCalled();
    await waitFor(() => expect(onStatus).toHaveBeenCalledWith(expect.objectContaining({ ok: true })));
  });

  it("restores from the current location and reports status", async () => {
    const onStatus = vi.fn();
    render(<StorageLocationCard onStatus={onStatus} />);
    await userEvent.click(screen.getByRole("button", { name: /Restore from here/i }));
    expect(mocks.restoreFromTarget).toHaveBeenCalled();
    await waitFor(() => expect(onStatus).toHaveBeenCalledWith(expect.objectContaining({ ok: true })));
  });

  it("switching to a non-filesystem target skips the folder picker", async () => {
    const onStatus = vi.fn();
    render(<StorageLocationCard onStatus={onStatus} />);
    await userEvent.click(screen.getByRole("radio", { name: /App private storage/i }));
    expect(mocks.configure).not.toHaveBeenCalled();
    expect(mocks.setBackupTargetKind).toHaveBeenCalledWith("opfs");
  });

  it("choosing the filesystem target prompts for a folder", async () => {
    mocks.getBackupTargetKind.mockReturnValue("opfs");
    const onStatus = vi.fn();
    render(<StorageLocationCard onStatus={onStatus} />);
    await userEvent.click(screen.getByRole("radio", { name: /A folder you choose/i }));
    expect(mocks.configure).toHaveBeenCalled();
    await waitFor(() => expect(mocks.setBackupTargetKind).toHaveBeenCalledWith("filesystem"));
  });

  it("reports an error when the folder picker is cancelled", async () => {
    mocks.getBackupTargetKind.mockReturnValue("opfs");
    mocks.configure.mockResolvedValue(false);
    const onStatus = vi.fn();
    render(<StorageLocationCard onStatus={onStatus} />);
    await userEvent.click(screen.getByRole("radio", { name: /A folder you choose/i }));
    await waitFor(() => expect(onStatus).toHaveBeenCalledWith(expect.objectContaining({ ok: false })));
    expect(mocks.setBackupTargetKind).not.toHaveBeenCalled();
  });

  it("forgets the folder when asked", async () => {
    mocks.forgetBackupFolder.mockResolvedValue(undefined);
    render(<StorageLocationCard onStatus={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Forget folder/i }));
    expect(mocks.forgetBackupFolder).toHaveBeenCalled();
  });
});
