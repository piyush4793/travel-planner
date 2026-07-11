import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { loadLS, saveLS } from "../../core/storage";
import { LS_KEYS } from "../../core/lsKeys";

// ─── Tour step definitions ───────────────────────────────────────────────────

type StepKind = "hero" | "spotlight" | "install";

type TourStep = {
  kind: StepKind;
  /** CSS selector for spotlight target */
  target?: string;
  position?: "top" | "bottom" | "left" | "right";
  emoji: string;
  title: string;
  body: string;
  /** Gradient for hero cards */
  gradient?: string;
  /** Decorative floating emoji for hero cards */
  floaters?: string[];
};

/** Luxury emerald/ivory gradient palette — one on-brand hero look with subtle
 *  hue shifts per card, matching the app's Plan/Trips surfaces. */
const HERO_GRADIENT = "from-emerald-700 via-emerald-800 to-teal-900";

const STEPS: TourStep[] = [
  {
    kind: "hero",
    emoji: "\u{1F9ED}",
    title: "Welcome to Roamwise",
    body: "Your personal travel companion for 197 countries. Plan single or multi-country trips, save them to revisit anytime, and discover your next adventure \u2014 all offline, all free.",
    gradient: HERO_GRADIENT,
    floaters: ["\u2708\uFE0F", "\u{1F30D}", "\u{1F3D4}\uFE0F", "\u{1F3D6}\uFE0F", "\u{1F5FC}", "\u{1F30A}", "\u26F0\uFE0F", "\u{1F308}"],
  },
  {
    kind: "spotlight",
    target: "[data-tour='nav-plan']",
    position: "bottom",
    emoji: "\u{1F9ED}",
    title: "Plan Your Trip",
    body: "Start here. Pick a destination and we'll shape a day-by-day itinerary \u2014 pick one country or chain several into a multi-stop route, all with the same planner.",
  },
  {
    kind: "spotlight",
    target: "[data-tour='nav-trips']",
    position: "bottom",
    emoji: "\u{1F9F3}",
    title: "Your Saved Trips",
    body: "Every trip you plan is saved here automatically. Reopen a route to keep tuning it, favourite the ones you love, and pick up right where you left off.",
  },
  {
    kind: "spotlight",
    target: "[data-tour='nav-discover']",
    position: "bottom",
    emoji: "\u{1F30D}",
    title: "Discover the World",
    body: "Browse all 197 countries by region. Find hidden gems, check best months, and add destinations to your list with one tap.",
  },
  {
    kind: "spotlight",
    target: "[data-tour='nav-calendar']",
    position: "bottom",
    emoji: "\u{1F4C5}",
    title: "When to Travel",
    body: "A heatmap of the best months for every destination. Green means go, red means avoid \u2014 plan your timing perfectly.",
  },
  {
    kind: "hero",
    emoji: "\u{1F3AC}",
    title: "Cinematic Fly-throughs",
    body: "Generate an itinerary for any country, then watch an animated 3D fly-through of your entire trip on the map \u2014 city by city, with realistic vehicles and route trails.",
    gradient: "from-emerald-800 via-teal-800 to-cyan-900",
    floaters: ["\u{1F3A5}", "\u{1F30C}", "\u{1F681}", "\u{1F682}", "\u{1F697}", "\u26F5", "\u{1F3DE}\uFE0F", "\u{1F304}"],
  },
  {
    kind: "spotlight",
    target: "[data-tour='settings']",
    position: "bottom",
    emoji: "\u2699\uFE0F",
    title: "Settings & Backup",
    body: "Open Settings to export your data, set up auto-backups, and configure AI providers for smart trip planning.",
  },
  {
    kind: "install",
    emoji: "\u{1F4F2}",
    title: "Take Roamwise Anywhere",
    body: "",
    gradient: "from-teal-600 via-emerald-700 to-emerald-900",
    floaters: ["\u{1F4F1}", "\u2708\uFE0F", "\u{1F5FA}\uFE0F", "\u{1F9F3}", "\u{1F30E}", "\u{1F3DD}\uFE0F"],
  },
  {
    kind: "hero",
    emoji: "\u2728",
    title: "You\u2019re Ready to Explore!",
    body: "Start by planning your next trip or discovering new countries. Your next adventure is waiting.",
    gradient: "from-emerald-600 via-teal-600 to-cyan-700",
    floaters: ["\u{1F389}", "\u{1F30F}", "\u2708\uFE0F", "\u{1F5FA}\uFE0F", "\u26F0\uFE0F", "\u{1F3D6}\uFE0F", "\u{1F30A}", "\u2B50"],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

type Props = {
  canPromptInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  onInstall: () => Promise<boolean>;
};

export default function FreTour({ canPromptInstall, isInstalled, isIOS, onInstall }: Props) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [installing, setInstalling] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [isMobile, setIsMobile] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const reducedMotion = typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Focus trap: move focus into dialog on mount and trap Tab
  useEffect(() => {
    if (!visible || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const prev = document.activeElement as HTMLElement | null;
    // Focus first focusable element
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length) focusable[0].focus();

    const trapFocus = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", trapFocus);
    return () => {
      document.removeEventListener("keydown", trapFocus);
      prev?.focus?.();
    };
  }, [visible, step]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const done = loadLS<boolean>(LS_KEYS.FRE_DONE, false);
    if (!done) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const s = STEPS[step];
    if (s.kind !== "spotlight" || !s.target) { setRect(null); return; }
    const selector = s.target;
    // Find visible target — skip hidden elements (e.g. desktop nav when on mobile)
    const allMatches = document.querySelectorAll(selector);
    let el: Element | null = null;
    for (const candidate of allMatches) {
      const r = candidate.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) { el = candidate; break; }
    }
    if (!el) { setRect(null); return; }
    // On mobile, scroll target into view first
    if (isMobile) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Wait for scroll to settle before measuring
      const t = setTimeout(() => setRect(el.getBoundingClientRect()), 350);
      return () => clearTimeout(t);
    }
    setRect(el.getBoundingClientRect());
  }, [step, visible, isMobile]);

  // Re-trigger animation on step change (skip when reduced-motion)
  useEffect(() => {
    if (!cardRef.current || reducedMotion) return;
    cardRef.current.classList.remove("fre-slide-next", "fre-slide-prev");
    void cardRef.current.offsetWidth; // force reflow
    cardRef.current.classList.add(direction === "next" ? "fre-slide-next" : "fre-slide-prev");
  }, [step, direction, reducedMotion]);

  const finish = useCallback(() => {
    saveLS(LS_KEYS.FRE_DONE, true);
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [visible, finish]);

  const next = useCallback(() => {
    if (step >= STEPS.length - 1) { finish(); return; }
    setDirection("next");
    setStep((s) => s + 1);
  }, [step, finish]);

  const prev = useCallback(() => {
    if (step > 0) { setDirection("prev"); setStep((s) => s - 1); }
  }, [step]);

  const handleInstall = useCallback(async () => {
    setInstalling(true);
    await onInstall();
    setInstalling(false);
    next();
  }, [onInstall, next]);

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  // On mobile, spotlight renders as hero only if we couldn't find the target
  const renderAsHero = current.kind === "hero" || (current.kind === "spotlight" && isMobile && !rect);

  return createPortal(
    <div ref={dialogRef} className="fixed inset-0 z-[9999]" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Escape") finish(); }} role="dialog" aria-modal="true" aria-label="Welcome tour">
      {/* Backdrop */}
      {current.kind === "spotlight" && rect ? (
        <SpotlightBackdrop rect={rect} />
      ) : (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      )}

      {/* Card */}
      <div ref={cardRef} className="absolute inset-0 fre-slide-next">
        {renderAsHero && (
          <HeroCard
            step={{ ...current, gradient: current.gradient || HERO_GRADIENT }}
            index={step}
            total={STEPS.length}
            isLast={isLast}
            onNext={next}
            onPrev={step > 0 ? prev : undefined}
            onSkip={finish}
          />
        )}
        {current.kind === "spotlight" && !renderAsHero && (
          <SpotlightCard
            step={current}
            targetRect={rect}
            index={step}
            total={STEPS.length}
            onNext={next}
            onPrev={prev}
            onSkip={finish}
          />
        )}
        {current.kind === "install" && (
          <InstallCard
            step={current}
            canPrompt={canPromptInstall}
            isInstalled={isInstalled}
            isIOS={isIOS}
            installing={installing}
            onInstall={handleInstall}
            onNext={next}
            onSkip={finish}
            onBack={prev}
            index={step}
            total={STEPS.length}
          />
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── Hero card (full-screen immersive) ───────────────────────────────────────

function HeroCard({ step, index, total, isLast, onNext, onPrev, onSkip }: {
  step: TourStep; index: number; total: number; isLast: boolean;
  onNext: () => void; onPrev?: () => void; onSkip: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 overflow-y-auto">
      <div className={`relative w-full max-w-xs rounded-3xl bg-gradient-to-br ${step.gradient} p-5 text-white shadow-2xl overflow-hidden my-auto`}>
        {/* Floating emoji decorations */}
        {step.floaters && <FloatingEmoji emojis={step.floaters} />}

        <div className="relative z-10">
          <div className="text-3xl mb-2 drop-shadow-lg">{step.emoji}</div>
          <h2 className="text-lg font-black tracking-tight mb-2 drop-shadow">{step.title}</h2>
          <p className="text-xs leading-relaxed text-white/90 mb-5">{step.body}</p>

          <div className="flex flex-col gap-3">
            {isLast && (
              <button
                onClick={onNext}
                className="w-full py-3 bg-white text-emerald-900 text-sm font-bold rounded-full whitespace-nowrap shadow-lg hover:shadow-xl hover:scale-[1.02] transition-[transform,box-shadow] active:scale-95 focus-ring"
              >
                {"Let\u2019s Go! \u{1F30D}"}
              </button>
            )}
            <div className="flex items-center justify-between">
              <ProgressBar current={index} total={total} />
              <div className="flex gap-2">
                {onPrev && (
                  <button onClick={onPrev} className="px-4 py-2 text-xs font-semibold text-white/70 hover:text-white transition-colors focus-ring rounded">
                    Back
                  </button>
                )}
                {!isLast && (
                  <button
                    onClick={onNext}
                    className="px-6 py-2.5 bg-white text-emerald-900 text-xs font-bold rounded-full whitespace-nowrap shadow-lg hover:shadow-xl hover:scale-105 transition-[transform,box-shadow] active:scale-95 focus-ring"
                  >
                    {"Next →"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {!isLast && (
            <button onClick={onSkip} className="absolute top-0 right-0 text-white/40 hover:text-white/80 text-lg transition-colors p-1 leading-none focus-ring" aria-label="Skip tour">
              {"✕"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Spotlight card ──────────────────────────────────────────────────────────

function SpotlightCard({ step, targetRect, index, total, onNext, onPrev, onSkip }: {
  step: TourStep; targetRect: DOMRect | null; index: number; total: number;
  onNext: () => void; onPrev: () => void; onSkip: () => void;
}) {
  const style = targetRect ? getPositionStyle(targetRect, step.position ?? "bottom") : {};

  return (
    <div
      className={`absolute ${targetRect ? "" : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"} w-[280px] max-w-[calc(100vw-24px)]`}
      style={targetRect ? style : undefined}
    >
      <div className="rounded-2xl shadow-2xl shadow-emerald-950/25 overflow-hidden bg-surface-1 border border-line p-5 text-ink-body" style={{ backgroundColor: "#faf8f1" }}>
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="text-2xl leading-none" aria-hidden="true">{step.emoji}</div>
              <button onClick={onSkip} className="-mr-1 -mt-1 flex items-center justify-center min-h-[32px] min-w-[32px] text-ink-4 hover:text-ink-1 text-lg transition-colors leading-none focus-ring-emerald rounded-lg" aria-label="Skip tour">
                {"✕"}
              </button>
            </div>
            <h3 className="text-sm font-bold text-ink-1 mb-1.5">{step.title}</h3>
            <p className="text-xs text-ink-body leading-relaxed">{step.body}</p>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-line">
            <ProgressBar current={index} total={total} />
            <div className="flex gap-2">
              <button onClick={onPrev} className="px-3 py-1.5 text-[11px] font-semibold text-ink-3 hover:text-ink-1 transition-colors focus-ring-emerald rounded">
                Back
              </button>
              <button onClick={onNext} className="px-5 py-1.5 bg-emerald-700 text-white text-[11px] font-bold rounded-full whitespace-nowrap transition-[transform,box-shadow,background-color] shadow-sm hover:bg-emerald-800 hover:shadow hover:scale-105 active:scale-95 focus-ring-emerald">
                {"Next →"}
              </button>
            </div>
          </div>
      </div>
    </div>
  );
}

// ─── Install card ────────────────────────────────────────────────────────────

function InstallCard({ step, canPrompt, isInstalled, isIOS, installing, onInstall, onNext, onSkip, onBack, index, total }: {
  step: TourStep; canPrompt: boolean; isInstalled: boolean; isIOS: boolean;
  installing: boolean; onInstall: () => void; onNext: () => void; onSkip: () => void; onBack: () => void;
  index: number; total: number;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 overflow-y-auto">
      <div className={`relative w-full max-w-xs rounded-3xl bg-gradient-to-br ${step.gradient} p-5 text-white shadow-2xl overflow-hidden my-auto`}>
        {step.floaters && <FloatingEmoji emojis={step.floaters} />}

        <div className="relative z-10">
          <button onClick={onSkip} className="absolute top-0 right-0 z-20 text-white/50 hover:text-white text-lg transition-colors p-2 leading-none focus-ring" aria-label="Skip tour">
            {"✕"}
          </button>
          <div className="text-3xl mb-2 drop-shadow-lg">{step.emoji}</div>
          <h2 className="text-lg font-black tracking-tight mb-2 drop-shadow">{step.title}</h2>

          {isInstalled ? (
            <p className="text-sm leading-relaxed text-white/90 mb-6">
              Roamwise is already installed on your device! It works offline and loads instantly from your home screen.
            </p>
          ) : canPrompt ? (
            <>
              <p className="text-sm leading-relaxed text-white/90 mb-4">
                Install Roamwise as a native app. It works offline, loads instantly, and lives right on your home screen!
              </p>
              <button
                onClick={onInstall}
                disabled={installing}
                className="w-full mb-4 px-5 py-3 bg-white text-emerald-900 text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-[transform,box-shadow] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 focus-ring"
              >
                {installing ? (
                  <><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-800 border-t-transparent" /> {"Installing\u2026"}</>
                ) : (
                  <>{"\u2B07\uFE0F"} Install Roamwise</>
                )}
              </button>
            </>
          ) : isIOS ? (
            <>
              <p className="text-sm leading-relaxed text-white/90 mb-3">
                Add Roamwise to your home screen:
              </p>
              <div className="bg-white/15 rounded-xl p-4 mb-4 backdrop-blur-sm">
                <ol className="text-sm text-white/90 leading-relaxed space-y-2">
                  <li className="flex gap-2"><span className="font-bold text-white">1.</span> Tap <span className="font-bold">Share</span> {"↑"} in Safari</li>
                  <li className="flex gap-2"><span className="font-bold text-white">2.</span> Tap <span className="font-bold">Add to Home Screen</span></li>
                  <li className="flex gap-2"><span className="font-bold text-white">3.</span> Tap <span className="font-bold">Add</span> to confirm</li>
                </ol>
              </div>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-white/90 mb-6">
              Install from your browser{"'"}s menu — look for {"\""}Install app{"\""} or {"\""}Add to Home Screen{"\""} in the toolbar.
            </p>
          )}

          <div className="flex items-center justify-between">
            <ProgressBar current={index} total={total} light />
            <div className="flex items-center gap-1">
              <button onClick={onBack} className="px-4 py-2 text-xs font-semibold text-white/70 hover:text-white transition-colors focus-ring rounded">
                Back
              </button>
              {!canPrompt && (
                <button onClick={onNext} className="px-4 py-2 text-xs font-bold text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors focus-ring">
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Floating emoji decorations ──────────────────────────────────────────────

function FloatingEmoji({ emojis }: { emojis: string[] }) {
  // Skip floating animations when user prefers reduced motion
  const reducedMotion = typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {emojis.map((emoji, i) => {
        const size = 16 + (i % 3) * 6;
        const left = (i * 13 + 5) % 90;
        const top = (i * 17 + 10) % 80;
        const delay = i * 0.4;
        const duration = 6 + (i % 4) * 2;
        return (
          <span
            key={`${emoji}-${i}`}
            className="absolute opacity-[0.08] animate-[freFloat_ease-in-out_infinite]"
            style={{
              fontSize: size,
              left: `${left}%`,
              top: `${top}%`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
            }}
          >
            {emoji}
          </span>
        );
      })}
    </div>
  );
}

// ─── Spotlight backdrop ──────────────────────────────────────────────────────

function SpotlightBackdrop({ rect }: { rect: DOMRect }) {
  const pad = 12;
  const r = 16;
  const x = rect.left - pad;
  const y = rect.top - pad;
  const w = rect.width + pad * 2;
  const h = rect.height + pad * 2;

  // Robust "spotlight" dim: a single fixed box whose huge box-shadow spread
  // darkens the entire viewport while its own rounded rect stays clear — the
  // cutout. No SVG mask / no backdrop-filter (both composite unreliably across
  // browsers), so the target reads crisply and the ivory card pops everywhere.
  return (
    <>
      <div
        aria-hidden="true"
        className="fixed"
        style={{
          left: x,
          top: y,
          width: w,
          height: h,
          borderRadius: r,
          boxShadow:
            "0 0 0 1.5px rgba(255,255,255,0.9), 0 0 0 9999px rgba(0,0,0,0.72)",
          pointerEvents: "none",
        }}
      />
      {/* Emerald brand glow ring — pulses unless reduced-motion */}
      <div
        aria-hidden="true"
        className="fixed motion-safe:animate-pulse"
        style={{
          left: x - 3,
          top: y - 3,
          width: w + 6,
          height: h + 6,
          borderRadius: r + 3,
          boxShadow:
            "0 0 0 2px rgba(16,185,129,0.7), 0 0 16px 3px rgba(16,185,129,0.45)",
          pointerEvents: "none",
        }}
      />
    </>
  );
}

// ─── Progress bar ────────────────────────────────────────────────────────────

function ProgressBar({ current, total, light }: { current: number; total: number; light?: boolean }) {
  const pct = total > 0 ? ((current + 1) / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className={`text-[10px] font-semibold tabular-nums ${light ? "text-white/70" : "text-ink-4"}`}>
        {current + 1}/{total}
      </span>
      <div
        className={`h-1 w-14 rounded-full overflow-hidden ${light ? "bg-white/25" : "bg-line"}`}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current + 1}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${light ? "bg-white" : "bg-emerald-700"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Positioning ─────────────────────────────────────────────────────────────

function getPositionStyle(rect: DOMRect, position: string): React.CSSProperties {
  const isMobileView = window.innerWidth < 768;
  const gap = isMobileView ? 20 : 14;
  const tooltipWidth = 280;
  const tooltipHeight = 180;

  const centerX = isMobileView
    ? Math.max(12, (window.innerWidth - tooltipWidth) / 2)
    : Math.max(12, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 12));

  // On mobile, if the target is inside the header, place card below the full header
  if (isMobileView) {
    // A target in the lower half of the viewport (e.g. the bottom tab bar) needs
    // its card placed above it, or the card would render off the bottom edge.
    if (rect.top > window.innerHeight / 2) {
      return { bottom: window.innerHeight - rect.top + gap, left: centerX };
    }
    const header = document.querySelector("header");
    const headerBottom = header ? header.getBoundingClientRect().bottom : rect.bottom;
    const cardTop = Math.max(rect.bottom, headerBottom) + gap;
    return { top: cardTop, left: centerX };
  }

  const effectivePosition = rect.top < tooltipHeight + gap ? "bottom" : position;

  switch (effectivePosition) {
    case "bottom": {
      const top = rect.bottom + gap;
      return { top, left: centerX };
    }
    case "top":
      return {
        bottom: window.innerHeight - rect.top + gap,
        left: centerX,
      };
    case "left":
      return { top: Math.max(12, rect.top + rect.height / 2 - 60), right: window.innerWidth - rect.left + gap };
    case "right":
      return { top: Math.max(12, rect.top + rect.height / 2 - 60), left: rect.right + gap };
    default:
      return { top: rect.bottom + gap, left: centerX };
  }
}
