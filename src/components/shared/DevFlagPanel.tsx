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
  multiCountryPlanning:  { label: "Multi-Country Planning", description: "Select multiple countries on the Plan page to build one multi-country trip" },
};

// Derived from PAID_FLAGS — single source of truth in featureFlags.ts
const PAID_CHILDREN = (Object.keys(FLAG_META) as (keyof FeatureFlags)[]).filter((k) => PAID_FLAGS.has(k));
const FREE_FLAGS = (Object.keys(FLAG_META) as (keyof FeatureFlags)[]).filter((k) => k !== "paidFeatures" && !PAID_FLAGS.has(k));

export default function DevFlagPanel({ size = "sm" }: { size?: "sm" | "md" }) {
  if (!IS_DEV) return null;
  return <DevFlagPanelInner size={size} />;
}

function DevFlagPanelInner({ size }: { size: "sm" | "md" }) {
  const [open, setOpen] = useState(false);
  const [flags, setFlags] = useState<FeatureFlags>(getFeatureFlags);
  const panelRef = useRef<HTMLDivElement>(null);

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
  const dims = size === "md" ? "w-9 h-9 text-base" : "w-8 h-8 text-sm";

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center justify-center ${dims} bg-[#efe9db] hover:bg-[#e5dfce] rounded-full transition-colors border border-[#e0dac9] focus-ring`}
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
            className="bg-[#fbf9f3] rounded-2xl shadow-2xl border border-[#e4dece] w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#123a2b] to-[#0f2f23] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">🛠 Feature Flags</h3>
                <p className="text-[10px] text-emerald-200/70 mt-0.5">Dev panel · localhost only</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-emerald-200/70 hover:text-white text-lg p-1 rounded-lg transition-colors focus-ring" aria-label="Close">✕</button>
            </div>

            <div className="px-6 py-5 space-y-5">

              {/* ── Paid tree ── */}
              <div>
                <p className="text-[9px] font-bold text-[#a8a293] uppercase tracking-wider mb-3">💎 Paid Features</p>

                {/* Root: paidFeatures */}
                <FlagRow flag="paidFeatures" flags={flags} meta={FLAG_META.paidFeatures} onToggle={toggle} root />

                {/* Children: indented with tree lines */}
                <div className="ml-3 mt-1 border-l-2 border-[#e4dece] pl-4 space-y-1">
                  {PAID_CHILDREN.map((key) => (
                    <FlagRow key={key} flag={key} flags={flags} meta={FLAG_META[key]} onToggle={toggle} dimmed={paidGateOff} />
                  ))}
                </div>

                {paidGateOff && (
                  <p className="text-[10px] text-amber-600 mt-2 ml-7 flex items-center gap-1">
                    <span>⚠</span> Enable master gate to unlock paid features
                  </p>
                )}
              </div>

              {/* ── Free tree ── */}
              <div>
                <p className="text-[9px] font-bold text-[#a8a293] uppercase tracking-wider mb-3">🆓 Free Features</p>
                <div className="space-y-1">
                  {FREE_FLAGS.map((key) => (
                    <FlagRow key={key} flag={key} flags={flags} meta={FLAG_META[key]} onToggle={toggle} />
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-[#efeadd] bg-[#f7f4ec] flex items-center justify-between">
              <p className="text-[10px] text-[#a8a293]">Changes apply instantly · paid children require master gate on</p>
              <button
                onClick={() => { localStorage.removeItem(LS_KEYS.FRE_DONE); window.location.reload(); }}
                className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 whitespace-nowrap focus-ring rounded px-1"
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
      root ? "bg-[#f4f1e8]" : "hover:bg-[#faf8f1]"
    } ${dimmed ? "opacity-40 pointer-events-none" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[13px] font-semibold ${root ? "text-[#16241d]" : "text-[#3c463f]"}`}>{meta.label}</span>
          {root && <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-full">root</span>}
        </div>
        <p className="text-[10px] text-[#a8a293]">{meta.description}</p>
      </div>
      <button
        onClick={() => onToggle(flag)}
        role="switch"
        aria-checked={enabled}
        aria-label={`${meta.label} ${enabled ? "on" : "off"}`}
        className={`relative w-11 h-7 rounded-full shrink-0 transition-colors duration-200 focus-ring ${
          enabled ? "bg-emerald-600" : "bg-[#d8d2c2]"
        }`}
      >
        <span className={`absolute top-1.5 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`} />
      </button>
    </div>
  );
}
