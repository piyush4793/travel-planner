import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getFeatureFlags, setFeatureFlag, PAID_FLAGS, type FeatureFlags } from "../../core/featureFlags";
import { LS_KEYS } from "../../core/lsKeys";

const IS_DEV = typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
   window.location.hostname === "127.0.0.1" ||
   new URLSearchParams(window.location.search).has("dev"));

type FlagMeta = { label: string; description: string };

const FLAG_META: Record<keyof FeatureFlags, FlagMeta> = {
  paidFeatures:          { label: "Paid Features", description: "Master gate — unlocks all premium features" },
  llmPlanning:           { label: "AI Trip Planning", description: "Chat, itinerary generation, save plans" },
  pdfExport:             { label: "PDF Export", description: "Export itineraries as PDF from country panel" },
  searchableHomeCountry: { label: "Searchable Home Country", description: "Dropdown with all 197 countries" },
  tripGroups:            { label: "Trip Groups", description: "Create multi-country trip groups" },
};

// Derived from PAID_FLAGS — single source of truth in featureFlags.ts
const PAID_CHILDREN = (Object.keys(FLAG_META) as (keyof FeatureFlags)[]).filter((k) => PAID_FLAGS.has(k));
const FREE_FLAGS = (Object.keys(FLAG_META) as (keyof FeatureFlags)[]).filter((k) => k !== "paidFeatures" && !PAID_FLAGS.has(k));

export default function DevFlagPanel() {
  const [open, setOpen] = useState(false);
  const [flags, setFlags] = useState<FeatureFlags>(getFeatureFlags);
  const panelRef = useRef<HTMLDivElement>(null);

  if (!IS_DEV) return null;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function toggle(key: keyof FeatureFlags) {
    const next = !flags[key];
    setFeatureFlag(key, next);
    setFlags({ ...flags, [key]: next });
    window.dispatchEvent(new Event("featureflag-change"));
  }

  const paidGateOff = !flags.paidFeatures;

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full text-sm transition-colors border border-white/15 focus-ring"
        aria-label="Dev: Feature Flags"
        aria-expanded={open}
      >
        🛠
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            ref={panelRef}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">🛠 Feature Flags</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Dev panel · localhost only</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white text-lg p-1 rounded-lg transition-colors focus-ring" aria-label="Close">✕</button>
            </div>

            <div className="px-6 py-5 space-y-5">

              {/* ── Paid tree ── */}
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-3">💎 Paid Features</p>

                {/* Root: paidFeatures */}
                <FlagRow flag="paidFeatures" flags={flags} meta={FLAG_META.paidFeatures} onToggle={toggle} root />

                {/* Children: indented with tree lines */}
                <div className="ml-3 mt-1 border-l-2 border-slate-200 pl-4 space-y-1">
                  {PAID_CHILDREN.map((key) => (
                    <FlagRow key={key} flag={key} flags={flags} meta={FLAG_META[key]} onToggle={toggle} dimmed={paidGateOff} />
                  ))}
                </div>

                {paidGateOff && (
                  <p className="text-[10px] text-amber-500 mt-2 ml-7 flex items-center gap-1">
                    <span>⚠</span> Enable master gate to unlock paid features
                  </p>
                )}
              </div>

              {/* ── Free tree ── */}
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-3">🆓 Free Features</p>
                <div className="space-y-1">
                  {FREE_FLAGS.map((key) => (
                    <FlagRow key={key} flag={key} flags={flags} meta={FLAG_META[key]} onToggle={toggle} />
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-[10px] text-slate-400">Changes apply instantly · paid children require master gate on</p>
              <button
                onClick={() => { localStorage.removeItem(LS_KEYS.FRE_DONE); window.location.reload(); }}
                className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap focus-ring rounded px-1"
              >
                Reset FRE
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function FlagRow({ flag, flags, meta, onToggle, root, dimmed }: {
  flag: keyof FeatureFlags;
  flags: FeatureFlags;
  meta: FlagMeta;
  onToggle: (key: keyof FeatureFlags) => void;
  root?: boolean;
  dimmed?: boolean;
}) {
  const enabled = flags[flag];
  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors ${
      root ? "bg-slate-50" : "hover:bg-slate-50"
    } ${dimmed ? "opacity-40 pointer-events-none" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[13px] font-semibold ${root ? "text-slate-800" : "text-slate-600"}`}>{meta.label}</span>
          {root && <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">root</span>}
        </div>
        <p className="text-[10px] text-slate-400">{meta.description}</p>
      </div>
      <button
        onClick={() => onToggle(flag)}
        role="switch"
        aria-checked={enabled}
        aria-label={`${meta.label} ${enabled ? "on" : "off"}`}
        className={`relative w-11 h-7 rounded-full shrink-0 transition-colors duration-200 focus-ring ${
          enabled ? "bg-blue-600" : "bg-slate-300"
        }`}
      >
        <span className={`absolute top-1.5 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`} />
      </button>
    </div>
  );
}
