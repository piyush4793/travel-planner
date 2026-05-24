import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getFeatureFlags, setFeatureFlag, type FeatureFlags } from "../../utils/featureFlags";

const IS_DEV = typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

type FlagMeta = { label: string; description: string; tier: "system" | "paid" | "free" };

const FLAG_META: Record<keyof FeatureFlags, FlagMeta> = {
  paidFeatures:          { label: "Paid Features", description: "Master gate — unlocks all premium features", tier: "system" },
  llmPlanning:           { label: "AI Trip Planning", description: "Chat with AI, generate itineraries, save plans", tier: "paid" },
  searchableHomeCountry: { label: "Searchable Home Country", description: "Dropdown with all 197 countries", tier: "free" },
};

type TierInfo = { label: string; icon: string; color: string; badgeColor: string; keys: (keyof FeatureFlags)[] };

const TIERS: TierInfo[] = [
  { label: "System", icon: "⚙️", color: "border-purple-200", badgeColor: "text-purple-700 bg-purple-100",
    keys: ["paidFeatures"] },
  { label: "Paid", icon: "💎", color: "border-amber-200", badgeColor: "text-amber-700 bg-amber-100",
    keys: ["llmPlanning"] },
  { label: "Free", icon: "🆓", color: "border-emerald-200", badgeColor: "text-emerald-700 bg-emerald-100",
    keys: ["searchableHomeCountry"] },
];

export default function DevFlagPanel() {
  const [open, setOpen] = useState(false);
  const [flags, setFlags] = useState<FeatureFlags>(getFeatureFlags);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
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

  function toggleTier(label: string) {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  const enabledCount = Object.values(flags).filter(Boolean).length;
  const totalCount = Object.keys(flags).length;

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
                <p className="text-[10px] text-slate-400 mt-0.5">Dev panel · localhost only · {enabledCount}/{totalCount} active</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white text-lg p-1 rounded-lg transition-colors">✕</button>
            </div>

            {/* Tier groups */}
            <div className="divide-y divide-slate-100">
              {TIERS.map((tier) => {
                const isCollapsed = collapsed[tier.label] ?? false;
                const tierEnabled = tier.keys.filter((k) => flags[k]).length;
                const gated = tier.label === "Paid" && !flags.paidFeatures;

                return (
                  <div key={tier.label}>
                    {/* Tier header */}
                    <button
                      onClick={() => toggleTier(tier.label)}
                      className="w-full flex items-center gap-2.5 px-6 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <span className={`text-[10px] text-slate-400 transition-transform duration-200 ${isCollapsed ? "" : "rotate-90"}`}>▸</span>
                      <span className="text-sm">{tier.icon}</span>
                      <span className="text-xs font-bold text-slate-700 flex-1 text-left">{tier.label}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${tier.badgeColor}`}>
                        {tierEnabled}/{tier.keys.length}
                      </span>
                    </button>

                    {/* Flags */}
                    <div className={`grid transition-all duration-200 ease-out ${isCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"}`}>
                      <div className="overflow-hidden">
                        <div className={`px-6 pb-4 pt-1 space-y-3 ${gated ? "opacity-40" : ""}`}>
                          {tier.keys.map((key) => {
                            const meta = FLAG_META[key];
                            return (
                              <div key={key} className="flex items-start gap-4">
                                <div className="flex-1 min-w-0">
                                  <span className="text-[13px] font-semibold text-slate-800">{meta.label}</span>
                                  <p className="text-[11px] text-slate-400 leading-snug">{meta.description}</p>
                                  <p className="text-[9px] text-slate-300 font-mono mt-0.5">{key}</p>
                                </div>
                                <button
                                  onClick={() => toggle(key)}
                                  className={`relative w-11 h-6 rounded-full shrink-0 mt-0.5 transition-colors duration-200 ${
                                    flags[key] ? "bg-blue-600" : "bg-slate-300"
                                  }`}
                                >
                                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-200 ${
                                    flags[key] ? "left-6" : "left-1"
                                  }`} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50">
              <p className="text-[10px] text-slate-400">Paid flags are dimmed when master gate is off · changes apply instantly</p>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
