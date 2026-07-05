import { memo } from "react";
import type { Country } from "../../../core/types";

type Props = {
  country: Country;
  /** Opens a combine-with destination when it exists in the user's world. */
  onOpenCombo?: (name: string) => void;
};

const SHORT = (m: string) => m.slice(0, 3);

/**
 * Compact "Good to know" context for the Review step — the decision-shaping
 * facts from the Country Panel (when to go, watch-outs, stopover, combine-with)
 * distilled into the guided-plan luxury theme. Renders nothing when the country
 * carries none of these, so it never adds empty chrome.
 */
function PlanInsightsInner({ country, onOpenCombo }: Props) {
  const best = country.bestMonths ?? [];
  const worst = country.worstMonths ?? [];
  const avoid = country.avoid ?? [];
  const combo = country.combo ?? [];
  const stopover = country.stopoverNote;

  const hasWhen = best.length > 0 || worst.length > 0;
  if (!hasWhen && !stopover && avoid.length === 0 && combo.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-[#e4dece] bg-white/85 p-4 shadow-[0_1px_3px_rgba(20,40,30,0.05)]"
      aria-label={`Good to know about ${country.name}`}
    >
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">Good to know</p>

      <div className="space-y-3">
        {hasWhen && (
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[#a8a293]">When to go</p>
            <div className="flex flex-wrap gap-1">
              {best.map((m) => (
                <span key={`b-${m}`} className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100/80 text-emerald-800">
                  {SHORT(m)}
                </span>
              ))}
              {worst.map((m) => (
                <span
                  key={`w-${m}`}
                  title={`Best avoided in ${m}`}
                  className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-600"
                >
                  <span aria-hidden="true">✕ </span>
                  {SHORT(m)}
                </span>
              ))}
            </div>
          </div>
        )}

        {stopover && (
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#a8a293]">✈️ Stopover tip</p>
            <p className="text-xs leading-relaxed text-[#4f5a52]">{stopover}</p>
          </div>
        )}

        {avoid.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">⚠️ Watch out for</p>
            <ul className="space-y-1">
              {avoid.map((item) => (
                <li key={item} className="flex gap-2 text-xs leading-snug text-[#4f5a52]">
                  <span className="mt-0.5 shrink-0 text-amber-500">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {combo.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[#a8a293]">Pairs well with</p>
            <div className="flex flex-wrap gap-1.5">
              {combo.map((name) =>
                onOpenCombo ? (
                  <button
                    key={name}
                    onClick={() => onOpenCombo(name)}
                    title={`Open ${name}`}
                    className="focus-ring-emerald rounded-full border border-[#e4dece] bg-[#f4f1e8] px-2.5 py-1 text-[11px] font-semibold text-[#1e2a25] transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    {name}
                  </button>
                ) : (
                  <span
                    key={name}
                    className="rounded-full border border-[#e4dece] bg-[#f4f1e8] px-2.5 py-1 text-[11px] font-semibold text-[#6f6a5d]"
                  >
                    {name}
                  </span>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const PlanInsights = memo(PlanInsightsInner);
export default PlanInsights;
