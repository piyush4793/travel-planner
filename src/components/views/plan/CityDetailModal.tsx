import type { CityDecision } from "../../../core/utils/decideCities";
import { useBreakpoint } from "../../../hooks/useBreakpoint";
import ModalShell from "../../shared/ModalShell";

type Props = {
  decision: CityDecision;
  onToggle: () => void;
  onClose: () => void;
};

function Stat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "warn" }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9a9483]">{label}</p>
      <p className={`mt-1 truncate text-[13px] font-semibold ${tone === "warn" ? "text-amber-700" : "text-[#16241d]"}`}>{value}</p>
    </div>
  );
}

/**
 * Full detail for a single Places-step city — everything the compact
 * {@link DecisionCard} truncates (full "known for" brief, uncapped experience
 * tags, and the complete best/avoid windows). Renders as a bottom-sheet on
 * mobile and a centered modal on tablet/desktop, reusing {@link ModalShell}
 * for focus-trap, Escape, scroll-lock, backdrop dismiss and focus return. The
 * primary action mirrors the card affordance so a traveller can add or drop the
 * stop without leaving the detail view.
 */
export default function CityDetailModal({ decision: d, onToggle, onClose }: Props) {
  const isMobile = useBreakpoint() === "mobile";

  return (
    <ModalShell
      open
      onClose={onClose}
      label={`${d.name} details`}
      className={
        isMobile
          ? "relative flex max-h-[88vh] w-full flex-col self-end overflow-y-auto rounded-t-2xl bg-white px-5 pb-6 pt-3 shadow-2xl focus:outline-none motion-safe:animate-[slideUp_0.25s_ease-out]"
          : "relative flex max-h-[85vh] w-[440px] max-w-[calc(100vw-2rem)] flex-col overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl focus:outline-none motion-safe:animate-[scaleIn_0.18s_ease-out]"
      }
    >
      {isMobile && <span aria-hidden="true" className="mx-auto mb-3 h-1 w-9 shrink-0 rounded-full bg-[#d9d3c4]" />}

      <button
        type="button"
        onClick={onClose}
        aria-label="Close details"
        className="focus-ring-emerald absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#f2efe6] text-[#6f6a5d] transition-colors hover:bg-[#e7e2d5]"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <div className="pr-10">
        <h2 className="font-display text-2xl font-bold text-[#16241d]">{d.name}</h2>
        {d.signal && (
          <span className="mt-2 inline-block rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">{d.signal}</span>
        )}
      </div>

      {d.brief && <p className="mt-4 text-[13.5px] leading-relaxed text-[#4a463d]">{d.brief}</p>}

      {(d.recDays > 0 || d.bestWindow || d.avoidWindow) && (
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
          {d.recDays > 0 && <Stat label="≈ Recommended stay" value={`${d.recDays} ${d.recDays === 1 ? "night" : "nights"}`} />}
          {d.bestWindow && <Stat label="☀ Best time" value={d.bestWindow} />}
          {d.avoidWindow && <Stat label="⚠ Avoid" value={d.avoidWindow} tone="warn" />}
        </div>
      )}

      {(d.focusMatches.length > 0 || d.otherExperiences.length > 0) && (
        <div className="mt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9a9483]">Experiences</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {d.focusMatches.map((e) => (
              <span key={e} className="rounded-full border border-emerald-600 bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white">{e}</span>
            ))}
            {d.otherExperiences.map((e) => (
              <span key={e} className="rounded-full border border-[#e0dccb] bg-[#faf8f1] px-2.5 py-1 text-[11px] font-semibold text-[#8a8577]">{e}</span>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onToggle}
        aria-pressed={d.included}
        className={`focus-ring-emerald mt-6 min-h-[48px] w-full rounded-xl px-4 py-3.5 text-[15px] font-bold transition-colors ${
          d.included
            ? "border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            : "bg-emerald-700 text-white hover:bg-emerald-800"
        }`}
      >
        {d.included ? "✓ In your plan — tap to remove" : "+ Add to plan"}
      </button>
    </ModalShell>
  );
}
