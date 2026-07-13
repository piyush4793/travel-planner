import type { TripScope } from "@/core/trip/destinationSource";

type Props = {
  scope: TripScope;
  onChange: (scope: TripScope) => void;
  /** The traveller's home country — labels the domestic option ("Within X"). */
  homeCountry: string;
};

/**
 * Landing-only segmented toggle that swaps the Plan wizard's destination scope
 * between world countries and the traveller's own country. Only rendered when a
 * domestic dataset exists for the home country (gated by the caller); the whole
 * wizard downstream is scope-agnostic — flipping this just swaps the underlying
 * {@link DestinationSource}. The domestic label is derived from `homeCountry`,
 * never hardcoded, so this generalises to any future home-country dataset.
 */
export default function ScopeToggle({ scope, onChange, homeCountry }: Props) {
  const options: { value: TripScope; icon: string; label: string }[] = [
    { value: "international", icon: "🌍", label: "International" },
    { value: "domestic", icon: "🏠", label: `Within ${homeCountry}` },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Trip scope"
      className="relative mt-3 inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 p-1 backdrop-blur-sm"
    >
      {options.map((opt) => {
        const active = scope === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`focus-ring inline-flex min-h-[32px] items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
              active ? "bg-surface-1 text-brand-800 shadow-sm" : "text-brand-100/90 hover:text-white"
            }`}
          >
            <span aria-hidden="true">{opt.icon}</span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
