import { useCallback, useEffect, useState } from "react";
import type { BackupTargetKind } from "../../../core/platform/defaults";
import { getPlatformProfile } from "../../../core/platform/platformProfile";
import { allBackupTargets, getBackupTarget } from "../../../core/platform/selectBackupTarget";
import { fileSystemBackupTarget, forgetBackupFolder } from "../../../core/adapters/backup/fileSystemBackupTarget";
import {
  getBackupTargetKind, setBackupTargetKind,
  backupToTarget, restoreFromTarget,
} from "../../../utils/backup";
import { SectionCard } from "./SettingsUI";

const KIND_LABEL: Record<BackupTargetKind, string> = {
  filesystem: "A folder you choose",
  opfs: "App private storage",
  download: "Browser Downloads",
};

const KIND_HINT: Record<BackupTargetKind, string> = {
  filesystem: "A real file in the folder you pick — visible in your file manager, easy to copy or move.",
  opfs: "Kept inside the app's private storage — not visible in your file manager. Restore it with \u201CRestore from here\u201D, or pick Browser Downloads for a portable file.",
  download: "A real, dated file in your Downloads (roamwise-backup-<date>.json) — findable and portable, but can't auto-restore.",
};

const OS_LABEL: Record<string, string> = {
  windows: "Windows", macos: "macOS", ios: "iOS", android: "Android", linux: "Linux", unknown: "Web",
};

type Status = { ok: boolean; msg: string } | null;

export default function StorageLocationCard({ onStatus }: { onStatus: (s: Status) => void }) {
  const profile = getPlatformProfile();
  const [kind, setKind] = useState<BackupTargetKind>(getBackupTargetKind);
  const [location, setLocation] = useState("Checking…");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Status>(null);

  const report = useCallback((s: Status) => {
    setFeedback(s);
    onStatus(s);
  }, [onStatus]);

  const refreshLocation = useCallback((k: BackupTargetKind) => {
    let cancelled = false;
    getBackupTarget(k).location().then((loc) => { if (!cancelled) setLocation(loc); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => refreshLocation(kind), [kind, refreshLocation]);

  const chooseKind = async (next: BackupTargetKind) => {
    if (next === "filesystem") {
      const ok = await fileSystemBackupTarget.configure();
      if (!ok) { report({ ok: false, msg: "No folder selected. Pick a regular folder like Documents/Roamwise \u2014 system folders are blocked by the browser." }); return; }
    }
    setBackupTargetKind(next);
    setKind(next);
    report({ ok: true, msg: `Backups will be saved to: ${KIND_LABEL[next]}.` });
  };

  const backupNow = async () => {
    setBusy(true);
    setFeedback(null);
    const result = await backupToTarget();
    setBusy(false);
    refreshLocation(kind);
    report({ ok: result.ok, msg: result.ok ? `Backed up to ${result.location}.` : "Backup failed. Try a different location." });
  };

  const restoreNow = async () => {
    setBusy(true);
    setFeedback(null);
    const result = await restoreFromTarget();
    setBusy(false);
    report(result);
  };

  const changeFolder = async () => {
    const ok = await fileSystemBackupTarget.configure();
    if (ok) { refreshLocation(kind); report({ ok: true, msg: "Backup folder updated." }); }
    else { report({ ok: false, msg: "Pick a regular folder like Documents/Roamwise \u2014 system folders are blocked by the browser." }); }
  };

  const forgetFolder = async () => {
    await forgetBackupFolder();
    refreshLocation(kind);
    report({ ok: true, msg: "Backup folder forgotten." });
  };

  const targets = allBackupTargets();

  return (
    <SectionCard
      title="Storage location"
      icon={"\u{1F4CD}"}
      accent="bg-brand-100 text-brand-600"
      desc="Where auto-backups are saved on this device, so you can find and restore them later."
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-ink-2">This device</span>
          <span className="text-[11px] font-semibold text-ink-1">
            {OS_LABEL[profile.os] ?? "Web"} · {profile.formFactor === "mobile" ? "Mobile" : "Desktop"}
          </span>
        </div>

        <div
          role="radiogroup"
          aria-label="Backup location"
          className="grid gap-1.5"
        >
          {targets.map((t) => (
            <button
              key={t.kind}
              role="radio"
              aria-checked={kind === t.kind}
              onClick={() => chooseKind(t.kind)}
              className={`focus-ring min-h-[32px] w-full px-3 py-2 rounded-xl text-left text-[11px] font-medium transition-colors flex items-center justify-between gap-2 ${
                kind === t.kind
                  ? "bg-brand-600 text-white"
                  : "bg-surface-track hover:bg-line text-ink-body"
              }`}
            >
              <span>{KIND_LABEL[t.kind]}</span>
              {kind === t.kind && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>

        <p className="text-[10px] leading-relaxed text-ink-2 px-0.5">{KIND_HINT[kind]}</p>

        <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2">
          <span className="text-[10px] text-ink-2">Current location</span>
          <span className="text-[10px] font-semibold text-ink-1 truncate max-w-[60%] text-right">{location}</span>
        </div>

        {kind === "filesystem" && (
          <div className="flex gap-2">
            <button
              onClick={changeFolder}
              className="focus-ring flex-1 min-h-[32px] px-3 py-2 rounded-xl bg-surface-track hover:bg-line text-ink-body text-[11px] font-semibold transition-colors"
            >
              Change folder
            </button>
            <button
              onClick={forgetFolder}
              className="focus-ring flex-1 min-h-[32px] px-3 py-2 rounded-xl bg-surface-track hover:bg-line text-ink-body text-[11px] font-semibold transition-colors"
            >
              Forget folder
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={backupNow}
            disabled={busy}
            className="focus-ring flex-1 min-h-[32px] px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white text-[11px] font-semibold transition-colors"
          >
            {busy ? "Working…" : "Back up now"}
          </button>
          <button
            onClick={restoreNow}
            disabled={busy}
            className="focus-ring flex-1 min-h-[32px] px-3 py-2 rounded-xl bg-surface-track hover:bg-line disabled:opacity-60 text-ink-body text-[11px] font-semibold transition-colors"
          >
            Restore from here
          </button>
        </div>

        {feedback && (
          <p
            role="status"
            aria-live="polite"
            className={`text-[10px] leading-relaxed px-0.5 ${feedback.ok ? "text-brand-600" : "text-rose-600"}`}
          >
            {feedback.ok ? "\u2713 " : "\u26A0 "}{feedback.msg}
          </p>
        )}
      </div>
    </SectionCard>
  );
}
