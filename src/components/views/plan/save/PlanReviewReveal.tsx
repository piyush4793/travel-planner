import ModalShell from "@/components/shared/ModalShell";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Route identity, e.g. "Japan → Thailand" or a single country name. */
  routeName: string;
  days: number;
  cities: number;
  /** Wall-clock seconds from starting the plan to reaching Review, if known. */
  seconds?: number;
};

/**
 * The one-time "your trip is ready" reveal — the payoff moment shown the very
 * first time a traveller reaches Review. A restrained, luxury celebration (no
 * confetti library): a soft emerald medallion, the headline stat, an honest
 * "saved to My Trips" reassurance, and an optional "planned in Ns" flourish.
 * Shown once ever (the caller persists the seen flag), so it never nags. Focus
 * trap / Escape / device-Back come from {@link ModalShell}.
 */
export default function PlanReviewReveal({ open, onClose, routeName, days, cities, seconds }: Props) {
  const showSpeed = seconds != null && seconds > 0 && seconds <= 120;
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      label="Your trip is ready"
      backdropClassName="bg-brand-950/50 backdrop-blur-sm"
      className="relative mx-4 w-full max-w-sm overflow-hidden rounded-3xl border border-brand-100 bg-surface-1 text-center shadow-2xl focus:outline-none motion-safe:animate-[scaleIn_0.22s_ease-out]"
    >
      <div className="bg-gradient-to-b from-brand-50 to-white px-6 pb-6 pt-8">
        <div
          aria-hidden="true"
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-1 text-3xl shadow-sm ring-1 ring-brand-100"
        >
          ✨
        </div>
        <h2 className="font-display text-xl font-bold tracking-tight text-brand-950">Your trip is ready</h2>
        <p className="mx-auto mt-1.5 max-w-[16rem] text-[13px] leading-relaxed text-ink-body">
          <span className="font-semibold text-ink-1">{days}</span> {days === 1 ? "day" : "days"} ·{" "}
          <span className="font-semibold text-ink-1">{cities}</span> {cities === 1 ? "city" : "cities"} across{" "}
          <span className="font-semibold text-brand-700">{routeName}</span>
        </p>

        {showSpeed && (
          <span className="mt-3 inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-bold text-brand-800">
            <span aria-hidden="true">⚡</span> Planned in {seconds}s
          </span>
        )}

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-brand-700">
          <span aria-hidden="true">✓</span> Saved to My Trips — reopen it anytime
        </p>
      </div>

      <div className="px-6 pb-6">
        <button
          type="button"
          onClick={onClose}
          className="focus-ring-emerald min-h-[44px] w-full rounded-xl bg-brand-700 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-brand-800"
        >
          Explore your itinerary →
        </button>
      </div>
    </ModalShell>
  );
}
