import { useState, useRef } from "react";
import type { LLMProviderType, LLMKeys, Country } from "../../core/types";
import { loadLS, saveLS } from "../../core/storage";
import { LS_KEYS } from "../../core/lsKeys";
import { validateKey, PROVIDER_LABELS, PROVIDER_PRICING } from "../../utils/ai/llmProvider";
import {
  exportFullBackup,
  exportCountriesCSV, importCountriesCSV, exportCountriesXLSX,
  getBackupFrequency, setBackupFrequency,
  getBackupSchedule, setBackupSchedule,
  getLastBackupLabel, getNextBackupLabel,
  parseBackupFile, applyBackup,
  type BackupFrequency, type BackupSchedule, type BackupPreview,
} from "../../utils/backup";
import { isEnabled } from "../../core/featureFlags";
import { getLLMKeys, getActiveProvider, saveLLMKeys, saveActiveProvider } from "../../core/utils/ai/llmSettings";
import ModalShell from "../shared/ModalShell";
import { useConfirm } from "../shared/ConfirmDialog";


const PROVIDERS: LLMProviderType[] = ["openai", "claude", "gemini"];

const PROVIDER_ICONS: Record<LLMProviderType, string> = {
  openai: "\u{1F916}",
  claude: "\u{1F9E0}",
  gemini: "\u{1F48E}",
};

const PROVIDER_HELP: Record<LLMProviderType, { placeholder: string; steps: string[] }> = {
  openai: {
    placeholder: "sk-...",
    steps: [
      "Go to platform.openai.com",
      "Sign in or create an account",
      "Navigate to API Keys in your account settings",
      'Click "Create new secret key"',
      "Copy and paste it above",
    ],
  },
  claude: {
    placeholder: "sk-ant-...",
    steps: [
      "Go to console.anthropic.com",
      "Sign in or create an account",
      "Navigate to API Keys",
      'Click "Create Key"',
      "Copy and paste it above",
    ],
  },
  gemini: {
    placeholder: "AIza...",
    steps: [
      "Go to aistudio.google.com/apikey",
      "Sign in with your Google account",
      'Click "Create API key"',
      "Select or create a Google Cloud project",
      "Copy and paste the key above",
    ],
  },
};

type SettingsTab = "ai" | "backup";
type Props = { open: boolean; onClose: () => void; onOpenChat?: () => void; countries?: Country[] };

export default function SettingsModal({ open, onClose, onOpenChat, countries }: Props) {
  const showAi = isEnabled("llmPlanning");
  const [tab, setTab] = useState<SettingsTab>(showAi ? "ai" : "backup");
  const [keys, setKeys] = useState<LLMKeys>(getLLMKeys);
  const [draft, setDraft] = useState("");
  const [provider, setProvider] = useState<LLMProviderType>(getActiveProvider);
  const [validating, setValidating] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [backupFreq, setBackupFreq] = useState<BackupFrequency>(getBackupFrequency);
  const [backupSched, setBackupSched] = useState<BackupSchedule>(getBackupSchedule);
  const [backupStatus, setBackupStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [restorePreview, setRestorePreview] = useState<BackupPreview | null>(null);
  const restoreRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [confirmDel, ConfirmDialog] = useConfirm();

  if (!open) return null;

  const currentKey = keys[provider] ?? "";
  const help = PROVIDER_HELP[provider];

  function handleProviderChange(p: LLMProviderType) {
    setProvider(p);
    saveActiveProvider(p);
    setDraft("");
    setStatus(null);
    setShowKey(false);
  }

  async function handleSave() {
    if (!draft.trim()) return;
    setValidating(true);
    setStatus(null);
    const result = await validateKey(provider, draft.trim());
    setValidating(false);
    if (result.ok) {
      const next = { ...keys, [provider]: draft.trim() };
      setKeys(next);
      saveLLMKeys(next);
      setDraft("");
      setStatus({ ok: true, msg: PROVIDER_LABELS[provider] + " key verified and saved!" });
    } else {
      setStatus({ ok: false, msg: result.error ?? "Validation failed" });
    }
  }

  async function handleDelete() {
    const ok = await confirmDel({
      title: "Delete API key?",
      message: `Remove the ${PROVIDER_LABELS[provider]} API key from this browser?`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    const next = { ...keys };
    delete next[provider];
    setKeys(next);
    saveLLMKeys(next);
    setDraft("");
    setStatus({ ok: true, msg: "Key removed." });
  }

  async function handleRestoreFile(file: File) {
    setBackupStatus(null);
    const preview = await parseBackupFile(file);
    if (preview.ok) {
      setRestorePreview(preview);
    } else {
      setBackupStatus({ ok: false, msg: preview.msg });
    }
  }

  function confirmRestore() {
    if (!restorePreview || !restorePreview.ok) return;
    const result = applyBackup(restorePreview.raw);
    setBackupStatus(result);
    setRestorePreview(null);
  }

  async function handleImportCSV(file: File) {
    setBackupStatus(null);
    const result = await importCountriesCSV(file);
    if (result.ok && result.countries?.length) {
      const existing = loadLS<Country[]>(LS_KEYS.CUSTOMS, []);
      const existingNames = new Set(existing.map((c) => c.name));
      const merged = [...existing];
      for (const c of result.countries) {
        if (existingNames.has(c.name)) {
          const idx = merged.findIndex((e) => e.name === c.name);
          if (idx >= 0) merged[idx] = c;
        } else {
          merged.push(c);
        }
      }
      saveLS(LS_KEYS.CUSTOMS, merged);
      setBackupStatus({ ok: true, msg: "Imported " + result.countries.length + " countries. Reload to see changes." });
    } else {
      setBackupStatus(result);
    }
  }

  function handleFreqChange(f: BackupFrequency) {
    setBackupFreq(f);
    setBackupFrequency(f);
  }

  function handleSchedChange(update: Partial<BackupSchedule>) {
    const next = { ...backupSched, ...update };
    setBackupSched(next);
    setBackupSchedule(next);
  }

  const masked = currentKey ? currentKey.slice(0, 7) + "\u2022".repeat(20) + currentKey.slice(-4) : "";

  return (
    <>
    <ModalShell
      open={open}
      onClose={onClose}
      label="Settings"
      className="bg-white md:rounded-2xl shadow-2xl w-full max-w-none md:max-w-md md:mx-4 p-5 md:p-6 space-y-4 h-dvh md:h-auto md:max-h-[90vh] overflow-y-auto"
      backdropClassName="bg-black/30 backdrop-blur-sm"
    >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="text-lg">{"\u2699\uFE0F"}</span> Settings
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1.5 min-w-[32px] min-h-[32px] rounded-lg focus-ring" aria-label="Close settings">{"\u2715"}</button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1" role="tablist" aria-label="Settings sections" onKeyDown={(e) => {
          const tabs: SettingsTab[] = showAi ? ["ai", "backup"] : ["backup"];
          const idx = tabs.indexOf(tab);
          if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); setTab(tabs[(idx + 1) % tabs.length]); }
          else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); setTab(tabs[(idx - 1 + tabs.length) % tabs.length]); }
        }}>
          {showAi && (
            <button
              role="tab"
              aria-selected={tab === "ai"}
              aria-controls="settings-panel-ai"
              id="settings-tab-ai"
              tabIndex={tab === "ai" ? 0 : -1}
              onClick={() => setTab("ai")}
              className={"flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors focus-ring " + (tab === "ai" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
            >
              {"\u{1F916}"} AI
            </button>
          )}
          <button
            role="tab"
            aria-selected={tab === "backup"}
            aria-controls="settings-panel-backup"
            id="settings-tab-backup"
            tabIndex={tab === "backup" ? 0 : -1}
            onClick={() => setTab("backup")}
            className={"flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors focus-ring " + (tab === "backup" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            {"\u{1F4BE}"} Backup
          </button>
        </div>

        {/* AI Tab */}
        {tab === "ai" && showAi && (
          <div className="space-y-4" role="tabpanel" id="settings-panel-ai" aria-labelledby="settings-tab-ai">
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">Provider</label>
              <div className="relative">
                <select
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value as LLMProviderType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 appearance-none cursor-pointer focus:outline-none focus:border-blue-400 hover:border-slate-300 transition-colors"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {PROVIDER_ICONS[p]} {PROVIDER_LABELS[p]}{keys[p] ? " \u2713" : ""}
                    </option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">{"\u25BC"}</span>
              </div>
            </div>

            {currentKey && (
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">Current Key</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <code className="text-xs text-emerald-600 flex-1 font-mono">{showKey ? currentKey : masked}</code>
                  <button onClick={() => setShowKey(!showKey)} className="text-[11px] px-2 py-1 min-h-[28px] rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-ring">{showKey ? "Hide" : "Show"}</button>
                  <button onClick={handleDelete} className="text-[11px] px-2 py-1 min-h-[28px] rounded text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors focus-ring">Delete</button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">
                {currentKey ? "Replace Key" : PROVIDER_LABELS[provider] + " API Key"}
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={help.placeholder}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-400"
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
                <button
                  onClick={handleSave}
                  disabled={!draft.trim() || validating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  {validating ? "Verifying\u2026" : "Save"}
                </button>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-[10px] leading-relaxed text-amber-700">
                  ⚠️ API keys are stored in your browser&apos;s local storage (unencrypted). Only use keys with spending limits set. Never share your browser profile.
                </p>
                {provider === "gemini" && (
                  <p className="text-[10px] text-amber-600 leading-snug mt-1">
                    🔑 Gemini keys are sent as a URL parameter (Google&apos;s required pattern). Restrict your key to the Generative Language API and set IP/referrer restrictions in Google Cloud Console.
                  </p>
                )}
              </div>
            </div>

            {status && (
              <p className={"text-xs " + (status.ok ? "text-emerald-600" : "text-red-500")}>{status.msg}</p>
            )}

            {currentKey && onOpenChat && (
              <button
                onClick={() => { onClose(); onOpenChat(); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {"\u2728"} Start Planning with AI
              </button>
            )}

            <details className="text-[11px] text-slate-500 cursor-pointer">
              <summary className="hover:text-slate-700 font-medium">{"\u{1F4B0}"} Token pricing reference</summary>
              <div className="mt-2 rounded-lg overflow-hidden border border-slate-200">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600">
                      <th className="px-3 py-1.5 text-left font-bold">Provider</th>
                      <th className="px-3 py-1.5 text-left font-bold">Model</th>
                      <th className="px-3 py-1.5 text-right font-bold">Input $/1M</th>
                      <th className="px-3 py-1.5 text-right font-bold">Output $/1M</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PROVIDERS.map((p) => {
                      const pr = PROVIDER_PRICING[p];
                      return (
                        <tr key={p} className={"border-t border-slate-100 " + (p === provider ? "bg-blue-50 text-slate-700" : "text-slate-500")}>
                          <td className="px-3 py-1.5">{PROVIDER_ICONS[p]} {PROVIDER_LABELS[p]}</td>
                          <td className="px-3 py-1.5">{pr.model}</td>
                          <td className="px-3 py-1.5 text-right font-mono">${pr.inputPer1M}</td>
                          <td className="px-3 py-1.5 text-right font-mono">${pr.outputPer1M}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[9px] text-slate-400 mt-1">Approximate pricing {"\u2014"} check provider dashboards for exact rates</p>
            </details>

            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 space-y-1">
              <p className="text-[11px] text-amber-700 font-medium">{"\u26A0"} Security Notice</p>
              <p className="text-[10px] text-amber-600/80 leading-relaxed">
                Your API key is stored in browser localStorage and used for direct API calls.
                It is never sent to any server other than the selected provider ({PROVIDER_LABELS[provider]}).
                However, it is accessible to browser extensions and dev tools. Use a key with appropriate spending limits.
              </p>
            </div>

            <details className="text-[11px] text-slate-400 cursor-pointer">
              <summary className="hover:text-slate-600">How to get a {PROVIDER_LABELS[provider]} API key</summary>
              <ol className="mt-2 space-y-1 text-[10px] text-slate-400 list-decimal list-inside leading-relaxed">
                {help.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </details>
          </div>
        )}

        {/* Backup Tab */}
        {tab === "backup" && (
          <div className="space-y-4" role="tabpanel" id="settings-panel-backup" aria-labelledby="settings-tab-backup">
            <p className="text-[10px] text-slate-400 leading-relaxed">
              All your travel data lives in this browser. Export backups to keep it safe.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Last backup</span>
                <span className="text-[11px] text-slate-700 font-medium">{getLastBackupLabel()}</span>
              </div>
              {backupFreq !== "never" && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Next auto-backup</span>
                  <span className="text-[11px] text-blue-600 font-medium">{getNextBackupLabel()}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">Export</label>
              <button
                onClick={async () => { await exportFullBackup(); setBackupStatus({ ok: true, msg: "Full backup downloaded!" }); }}
                className="w-full px-3 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {"\u{1F4E6}"} Full Backup (JSON)
              </button>
              <div className="flex gap-2">
                <button
                  onClick={async () => { if (countries?.length) { await exportCountriesCSV(countries); setBackupStatus({ ok: true, msg: "CSV exported!" }); } else { setBackupStatus({ ok: false, msg: "No countries to export" }); } }}
                  className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium rounded-lg transition-colors border border-slate-200"
                >
                  {"\u{1F4C4}"} Countries CSV
                </button>
                <button
                  onClick={async () => { if (countries?.length) { await exportCountriesXLSX(countries); setBackupStatus({ ok: true, msg: "XLSX exported!" }); } else { setBackupStatus({ ok: false, msg: "No countries to export" }); } }}
                  className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium rounded-lg transition-colors border border-slate-200"
                >
                  {"\u{1F4CA}"} Countries XLSX
                </button>
              </div>
              <p className="text-[9px] text-slate-400">Full backup includes everything. CSV/XLSX export only countries (human-editable).</p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">Restore</label>
              <div className="flex gap-2">
                <button
                  onClick={() => restoreRef.current?.click()}
                  className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium rounded-lg transition-colors border border-slate-200"
                >
                  {"\u{1F4E6}"} Restore Backup (JSON)
                </button>
                <button
                  onClick={() => importRef.current?.click()}
                  className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium rounded-lg transition-colors border border-slate-200"
                >
                  {"\u{1F4E5}"} Import (CSV)
                </button>
              </div>
              <input ref={restoreRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRestoreFile(f); e.target.value = ""; }} />
              <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportCSV(f); e.target.value = ""; }} />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">Auto-Backup Schedule</label>
              <div className="flex gap-1.5">
                {(["daily", "weekly", "monthly", "never"] as BackupFrequency[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => handleFreqChange(f)}
                    className={"flex-1 px-2 py-2 text-[11px] font-medium rounded-lg transition-colors " + (backupFreq === f ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200")}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              {backupFreq === "weekly" && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-500">Every:</span>
                  <select
                    value={backupSched.weekday ?? 0}
                    onChange={(e) => handleSchedChange({ weekday: parseInt(e.target.value) })}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-700 appearance-none cursor-pointer focus:outline-none focus:border-blue-400"
                  >
                    {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, i) => (
                      <option key={i} value={i}>{day}</option>
                    ))}
                  </select>
                </div>
              )}

              {backupFreq === "monthly" && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-500">Day of month:</span>
                  <select
                    value={backupSched.monthDay ?? 1}
                    onChange={(e) => handleSchedChange({ monthDay: parseInt(e.target.value) })}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-700 appearance-none cursor-pointer focus:outline-none focus:border-blue-400"
                  >
                    {Array.from({ length: 28 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>
              )}

              <p className="text-[9px] text-slate-400">
                {backupFreq === "never"
                  ? "Auto-backup disabled. Use the buttons above to back up manually."
                  : "A backup file will auto-download to your browser\u2019s download folder when overdue."}
              </p>
            </div>

            {backupStatus && (
              <p className={"text-xs " + (backupStatus.ok ? "text-emerald-600" : "text-red-500")}>{backupStatus.msg}</p>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 space-y-1.5">
              <p className="text-[10px] text-blue-600/80 leading-relaxed">
                {"\u{1F4A1}"} API keys are <span className="text-blue-700 font-medium">never</span> included in backups for security.
                Full backup restores everything else {"\u2014"} reload the page after restoring.
              </p>
              <p className="text-[10px] text-blue-600/80 leading-relaxed">
                {"\u{1F4C2}"} Manual exports open a <span className="text-blue-700 font-medium">Save As</span> dialog so you can choose where to save.
                Auto-backups download silently to your browser{"\u2019"}s default folder.
              </p>
              <div className="flex items-start gap-1.5 mt-1 bg-blue-100/60 rounded-md px-2 py-1.5">
                <span className="text-[10px] leading-none mt-px">{"\u{1F4C1}"}</span>
                <div className="text-[10px] text-blue-700 leading-relaxed">
                  <span className="font-medium">Default download location:</span>{" "}
                  <code className="bg-blue-100 px-1 py-0.5 rounded text-[9px] font-mono">
                    {navigator.platform?.toLowerCase().includes("mac")
                      ? "~/Downloads"
                      : navigator.platform?.toLowerCase().includes("win")
                      ? "C:\\Users\\{you}\\Downloads"
                      : "~/Downloads"}
                  </code>
                  <br />
                  <span className="text-blue-600/70">
                    Change it in your browser{"\u2019"}s{" "}
                    <span className="font-medium">Settings {"\u2192"} Downloads</span>
                    {" "}or enable {"\u201C"}Ask where to save{"\u201D"} for every download.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Restore confirmation dialog */}
        {restorePreview && restorePreview.ok && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => setRestorePreview(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-4 border-b">
                <h3 className="text-sm font-bold text-gray-900">📦 Restore Backup</h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                  <p className="text-[11px] text-slate-500">Backup from</p>
                  <p className="text-xs font-semibold text-slate-800">
                    {new Date(restorePreview.exportedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {restorePreview.countryCount > 0 && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                        🌍 {restorePreview.countryCount} countries
                      </span>
                    )}
                    {restorePreview.tripCount > 0 && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                        ✈️ {restorePreview.tripCount} trips
                      </span>
                    )}
                    {restorePreview.aiPlanCount > 0 && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">
                        ✨ {restorePreview.aiPlanCount} AI plans
                      </span>
                    )}
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      {restorePreview.totalKeys} data keys
                    </span>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                  <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                    ⚠️ All changes not backed up will be lost upon restore. This cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 px-5 py-3 border-t">
                <button
                  onClick={() => setRestorePreview(null)}
                  className="flex-1 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRestore}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Restore Now
                </button>
              </div>
            </div>
          </div>
        )}
    </ModalShell>
    {ConfirmDialog()}
    </>
  );
}
