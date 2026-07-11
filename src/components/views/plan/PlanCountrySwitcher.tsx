import { getCountryFlag } from "../../../utils/countryFlags";
import PlanMenu from "./PlanMenu";

/** Minimal per-stop summary the switcher needs — decoupled from PlacesUnit. */
export type SwitcherUnit = { name: string; places: number; days: number };

const CARET = (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 shrink-0 opacity-70">
    <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type Props = {
  units: SwitcherUnit[];
  activeIndex: number;
  onSelect: (index: number) => void;
  /** Visual skin: `dark` on emerald surfaces, `light` on the ivory header. */
  variant?: "dark" | "light";
};

/**
 * The multi-stop country switcher — one control the traveller uses to focus a
 * single country at a time on the Places step and in the header. Extracted so the
 * unified Trip Header and the Places body share one behaviour (DRY) and scale to
 * any stop count / long names (place-count badge, `line-clamp`). Reuses the portal
 * `PlanMenu` for collision handling, Escape/back close and focus return.
 */
export default function PlanCountrySwitcher({ units, activeIndex, onSelect, variant = "light" }: Props) {
  const safe = Math.min(activeIndex, Math.max(0, units.length - 1));
  const active = units[safe];
  if (!active) return null;

  const trigger =
    variant === "dark"
      ? "flex min-w-0 max-w-full items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-white transition-colors hover:bg-white/15 focus-ring-emerald"
      : "flex min-w-0 max-w-full items-center gap-2 rounded-full border border-[#d8d2c2] bg-white px-3.5 py-1.5 text-[#16241d] transition-colors hover:border-emerald-500 hover:bg-emerald-50 focus-ring-emerald";

  return (
    <PlanMenu
      ariaLabel="Switch country"
      width={340}
      triggerClassName={trigger}
      trigger={
        <>
          <span aria-hidden="true">{getCountryFlag(active.name)}</span>
          <span className="min-w-0 line-clamp-1 font-display text-base font-semibold">{active.name}</span>
          {units.length > 1 && (
            <span
              aria-hidden="true"
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                variant === "dark" ? "bg-white/15 text-white/80" : "bg-[#ece7d8] text-[#6f6a5d]"
              }`}
            >
              {safe + 1}/{units.length}
            </span>
          )}
          {CARET}
        </>
      }
    >
      {(close) => (
        <ul className="max-h-[60vh] overflow-y-auto py-1" aria-label="Countries on this route">
          {units.map((u, i) => (
            <li key={u.name}>
              <button
                role="menuitemradio"
                aria-checked={i === safe}
                onClick={() => { onSelect(i); close(); }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors focus-ring-emerald ${
                  i === safe ? "bg-emerald-50" : "hover:bg-[#faf8f1]"
                }`}
              >
                <span className="w-4 shrink-0 text-emerald-600" aria-hidden="true">{i === safe ? "✓" : ""}</span>
                <span aria-hidden="true">{getCountryFlag(u.name)}</span>
                <span className="min-w-0 flex-1 line-clamp-1 font-display text-[15px] font-semibold text-[#16241d]">{u.name}</span>
                <span className="shrink-0 whitespace-nowrap text-[12px] font-medium text-[#8a8577]">
                  {u.places} {u.places === 1 ? "place" : "places"} · {u.days}d
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </PlanMenu>
  );
}
