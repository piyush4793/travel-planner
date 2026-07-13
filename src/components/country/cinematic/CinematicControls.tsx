type Props = {
  /** Tailwind sizing for each control button (breakpoint-aware). */
  ctrlBtnSize: string;
  /** Whether a previous stop exists to replay to. */
  canGoPrev: boolean;
  paused: boolean;
  speed: number;
  onPrev: () => void;
  onTogglePause: () => void;
  onSkip: () => void;
  onCycleSpeed: () => void;
  onClose: () => void;
};

/**
 * The persistent cinematic playback footer bar (prev stop / pause / skip /
 * speed + close). Icon-only controls carry aria-labels. Extracted from
 * ItineraryCinematic as a pure presentational unit so the control surface is
 * directly unit-testable without spinning up the WebGL map engine.
 */
export default function CinematicControls({
  ctrlBtnSize,
  canGoPrev,
  paused,
  speed,
  onPrev,
  onTogglePause,
  onSkip,
  onCycleSpeed,
  onClose,
}: Props) {
  const btn = `${ctrlBtnSize} flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-sm font-bold transition-colors focus-ring`;
  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={!canGoPrev}
          className={`${btn} disabled:opacity-30 disabled:cursor-not-allowed`}
          title="Back to previous stop"
          aria-label="Back to previous stop"
        >
          ⏮
        </button>
        <button
          onClick={onTogglePause}
          className={btn}
          title={paused ? "Resume" : "Pause"}
          aria-label={paused ? "Resume" : "Pause"}
        >
          {paused ? "▶" : "⏸"}
        </button>
        <button
          onClick={onSkip}
          className={btn}
          title="Skip to next stop"
          aria-label="Skip to next stop"
        >
          ⏭
        </button>
        <button
          onClick={onCycleSpeed}
          className={`${ctrlBtnSize} flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold transition-colors tabular-nums focus-ring`}
          title="Playback speed"
          aria-label={`Playback speed ${speed}×`}
        >
          {speed}×
        </button>
      </div>
      <button
        onClick={onClose}
        className={`${ctrlBtnSize} flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-sm font-bold transition-colors text-stone-400 hover:text-white focus-ring`}
        title="Close"
        aria-label="Close"
      >
        ✕
      </button>
    </>
  );
}
