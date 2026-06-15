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

const STEPS: TourStep[] = [
  {
    kind: "hero",
    emoji: "\u{1F9ED}",
    title: "Welcome to Roamwise",
    body: "Your personal travel companion for 197 countries. Plan trips, explore itineraries, and discover your next adventure \u2014 all offline, all free.",
    gradient: "from-blue-600 via-indigo-600 to-violet-700",
    floaters: ["\u2708\uFE0F", "\u{1F30D}", "\u{1F3D4}\uFE0F", "\u{1F3D6}\uFE0F", "\u{1F5FC}", "\u{1F30A}", "\u26F0\uFE0F", "\u{1F308}"],
  },
  {
    kind: "spotlight",
    target: "[data-tour='nav-trips']",
    position: "bottom",
    emoji: "\u2708\uFE0F",
    title: "Your Trip Dashboard",
    body: "All your trips at a glance \u2014 progress ring, favorites, upcoming adventures. Tap any card to dive into the full itinerary.",
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
    gradient: "from-orange-500 via-rose-500 to-pink-600",
    floaters: ["\u{1F3A5}", "\u{1F30C}", "\u{1F681}", "\u{1F682}", "\u{1F697}", "\u26F5", "\u{1F3DE}\uFE0F", "\u{1F304}"],
  },
  {
    kind: "spotlight",
    target: "[data-tour='settings']",
    position: "bottom",
    emoji: "\u2699\uFE0F",
    title: "Settings & Backup",
    body: "Export your data as JSON, CSV, or XLSX. Set up auto-backups so you never lose a plan. Configure AI providers for smart trip planning.",
  },
  {
    kind: "install",
    emoji: "\u{1F4F2}",
    title: "Take Roamwise Anywhere",
    body: "",
    gradient: "from-emerald-500 via-teal-500 to-cyan-600",
    floaters: ["\u{1F4F1}", "\u2708\uFE0F", "\u{1F5FA}\uFE0F", "\u{1F9F3}", "\u{1F30E}", "\u{1F3DD}\uFE0F"],
  },
  {
    kind: "hero",
    emoji: "\u2728",
    title: "You\u2019re Ready to Explore!",
    body: "Start by browsing the Trips dashboard or discovering new countries. Your next adventure is waiting.",
    gradient: "from-blue-600 via-sky-500 to-cyan-500",
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
  const cardRef = useRef<HTMLDivElement>(null);

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
    const el = document.querySelector(s.target);
    if (!el) { setRect(null); return; }
    setRect(el.getBoundingClientRect());
  }, [step, visible]);

  // Re-trigger animation on step change
  useEffect(() => {
    if (!cardRef.current) return;
    cardRef.current.classList.remove("fre-slide-next", "fre-slide-prev");
    void cardRef.current.offsetWidth; // force reflow
    cardRef.current.classList.add(direction === "next" ? "fre-slide-next" : "fre-slide-prev");
  }, [step, direction]);

  const finish = useCallback(() => {
    saveLS(LS_KEYS.FRE_DONE, true);
    setVisible(false);
  }, []);

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

  return createPortal(
    <div className="fixed inset-0 z-[9999]" onClick={(e) => e.stopPropagation()}>
      {/* Backdrop */}
      {current.kind === "spotlight" && rect ? (
        <SpotlightBackdrop rect={rect} />
      ) : (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      )}

      {/* Card */}
      <div ref={cardRef} className="absolute inset-0 fre-slide-next">
        {current.kind === "hero" && (
          <HeroCard
            step={current}
            index={step}
            total={STEPS.length}
            isLast={isLast}
            onNext={next}
            onPrev={step > 0 ? prev : undefined}
            onSkip={finish}
          />
        )}
        {current.kind === "spotlight" && (
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
            onSkip={next}
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
                className="w-full py-3 bg-white text-slate-800 text-sm font-bold rounded-full whitespace-nowrap shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all active:scale-95"
              >
                {"Let\u2019s Go! \u{1F30D}"}
              </button>
            )}
            <div className="flex items-center justify-between">
              <ProgressBar current={index} total={total} />
              <div className="flex gap-2">
                {onPrev && (
                  <button onClick={onPrev} className="px-4 py-2 text-xs font-semibold text-white/70 hover:text-white transition-colors">
                    Back
                  </button>
                )}
                {!isLast && (
                  <button
                    onClick={onNext}
                    className="px-6 py-2.5 bg-white text-slate-800 text-xs font-bold rounded-full whitespace-nowrap shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95"
                  >
                    {"Next →"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {!isLast && (
            <button onClick={onSkip} className="absolute top-0 right-0 text-white/40 hover:text-white/80 text-lg transition-colors p-1 leading-none" title="Skip tour">
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
      <div className="rounded-2xl shadow-2xl shadow-blue-900/30 overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-5 text-white">
          <div className="relative">
            <div className="text-2xl mb-2 drop-shadow-lg">{step.emoji}</div>
            <h3 className="text-sm font-bold text-white drop-shadow mb-1.5">{step.title}</h3>
            <p className="text-xs text-white/85 leading-relaxed">{step.body}</p>
            <button onClick={onSkip} className="absolute top-0 right-0 text-white/40 hover:text-white/80 text-lg transition-colors p-1 leading-none" title="Skip tour">
              {"✕"}
            </button>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/15">
            <ProgressBar current={index} total={total} light />
            <div className="flex gap-2">
              <button onClick={onPrev} className="px-3 py-1.5 text-[11px] font-semibold text-white/60 hover:text-white transition-colors">
                Back
              </button>
              <button onClick={onNext} className="px-5 py-1.5 bg-white text-slate-800 text-[11px] font-bold rounded-full whitespace-nowrap transition-all shadow-sm hover:shadow hover:scale-105 active:scale-95">
                {"Next →"}
              </button>
            </div>
          </div>
      </div>
    </div>
  );
}

// ─── Install card ────────────────────────────────────────────────────────────

function InstallCard({ step, canPrompt, isInstalled, isIOS, installing, onInstall, onSkip, onBack, index, total }: {
  step: TourStep; canPrompt: boolean; isInstalled: boolean; isIOS: boolean;
  installing: boolean; onInstall: () => void; onSkip: () => void; onBack: () => void;
  index: number; total: number;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 overflow-y-auto">
      <div className={`relative w-full max-w-xs rounded-3xl bg-gradient-to-br ${step.gradient} p-5 text-white shadow-2xl overflow-hidden my-auto`}>
        {step.floaters && <FloatingEmoji emojis={step.floaters} />}

        <div className="relative z-10">
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
                className="w-full mb-4 px-5 py-3 bg-white text-slate-800 text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {installing ? (
                  <><span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-800 border-t-transparent" /> {"Installing\u2026"}</>
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
            <div className="flex gap-2">
              <button onClick={onBack} className="px-4 py-2 text-xs font-semibold text-white/70 hover:text-white transition-colors">
                Back
              </button>
              <button onClick={onSkip} className="px-6 py-2.5 bg-white text-slate-800 text-xs font-bold rounded-full whitespace-nowrap shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95">
                {isInstalled || !canPrompt ? "Next →" : "Maybe Later"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Floating emoji decorations ──────────────────────────────────────────────

function FloatingEmoji({ emojis }: { emojis: string[] }) {
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
            key={i}
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
  const pad = 8;
  const r = 14;
  const x = rect.left - pad;
  const y = rect.top - pad;
  const w = rect.width + pad * 2;
  const h = rect.height + pad * 2;

  return (
    <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
      <defs>
        <mask id="fre-mask">
          <rect width="100%" height="100%" fill="white" />
          <rect x={x} y={y} width={w} height={h} rx={r} fill="black" />
        </mask>
        <filter id="fre-glow">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="rgba(0,0,0,0.65)" mask="url(#fre-mask)" style={{ pointerEvents: "all" }} />
      {/* Blue glow ring */}
      <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} rx={r + 2} fill="none" stroke="rgba(59,130,246,0.5)" strokeWidth="3" filter="url(#fre-glow)" />
      <rect x={x} y={y} width={w} height={h} rx={r} fill="none" stroke="rgba(59,130,246,0.8)" strokeWidth="2" />
    </svg>
  );
}

// ─── Progress bar ────────────────────────────────────────────────────────────

function ProgressBar({ current, total, light }: { current: number; total: number; light?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-[10px] font-semibold ${light ? "text-white/60" : "text-slate-400"}`}>
        {current + 1}/{total}
      </span>
      <div className={`flex gap-1 ${light ? "opacity-80" : ""}`}>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-1 rounded-full transition-all duration-500 ${
              i === current
                ? `w-5 ${light ? "bg-white" : "bg-blue-600"}`
                : i < current
                ? `w-1.5 ${light ? "bg-white/50" : "bg-blue-300"}`
                : `w-1.5 ${light ? "bg-white/20" : "bg-slate-200"}`
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Positioning ─────────────────────────────────────────────────────────────

function getPositionStyle(rect: DOMRect, position: string): React.CSSProperties {
  const gap = 14;
  const tooltipWidth = 280;
  const tooltipHeight = 180; // approximate

  const centerX = Math.max(12, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 12));

  // If target is near the top, always place below regardless of requested position
  const effectivePosition = rect.top < tooltipHeight + gap ? "bottom" : position;

  switch (effectivePosition) {
    case "bottom":
      return {
        top: Math.min(rect.bottom + gap, window.innerHeight - tooltipHeight - 12),
        left: centerX,
      };
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
