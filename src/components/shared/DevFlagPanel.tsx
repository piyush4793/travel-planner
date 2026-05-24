import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getFeatureFlags, setFeatureFlag, type FeatureFlags } from "../../utils/featureFlags";

const IS_DEV = typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

type FlagMeta = { label: string; description: string; tier: "free" | "paid" | "system" };

const FLAG_META: Record<keyof FeatureFlags, FlagMeta> = {
  paidFeatures:          { label: "Paid Features", description: "Master gate — unlocks all premium features", tier: "system" },
  llmPlanning:           { label: "AI Trip Planning", description: "Chat with AI, generate itineraries, save plans", tier: "paid" },
  searchableHomeCountry: { label: "Searchable Home Country", description: "Dropdown with all 197 countries", tier: "free" },
};

const TIER_ORDER: (keyof FeatureFlags)[] = ["paidFeatures", "llmPlanning", "searchableHomeCountry"];

const TIER_COLORS: Record<string, string> = {
  system: "text-purple-700 bg-purple-100",
  paid: "text-amber-700 bg-amber-100",
  free: "text-emerald-700 bg-emerald-100",
};

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

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full text-sm transition-colors border border-white/15"
        title="Dev: Feature Flags"
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
                <h3 className="text-sm font-bold text-white flex items-center gap-2">🛠 Feature Flags</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Dev panel · localhost only · changes apply instantly</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white text-lg p-1 rounded-lg transition-colors">✕</button>
            </div>

            {/* Flags */}
            <div className="px-6 py-5 space-y-4">
              {TIER_ORDER.map((key) => {
                const meta = FLAG_META[key];
                const enabled = flags[key];
                const gated = meta.tier === "paid" && !flags.paidFeatures;

                return (
                  <div key={key} className={`flex items-start gap-4 ${gated ? "opacity-50" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-slate-800">{meta.label}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${TIER_COLORS[meta.tier]}`}>
                          {meta.tier}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">{meta.description}</p>
                      <p className="text-[9px] text-slate-300 font-mono mt-0.5">{key}</p>
                    </div>

                    {/* Toggle switch */}
                    <button
                      onClick={() => toggle(key)}
                      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors duration-200 ${
                        enabled ? "bg-blue-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-200 ${
                          enabled ? "left-6" : "left-1"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-[10px] text-slate-400">Paid flags are hidden when master gate is off</p>
              <div className="flex gap-1">
                {Object.values(TIER_COLORS).map((c, i) => (
                  <span key={i} className={`w-2 h-2 rounded-full ${c.split(" ")[1]}`} />
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
