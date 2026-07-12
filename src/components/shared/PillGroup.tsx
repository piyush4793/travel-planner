type PillOption = { key: string; label: string };

type Accent = "blue" | "emerald";

const ACCENT: Record<Accent, { container: string; active: string; idle: string; focus: string }> = {
  blue: {
    container: "bg-gray-100",
    active: "bg-white text-blue-700 shadow-sm",
    idle: "text-gray-500 hover:text-gray-700",
    focus: "focus-ring",
  },
  emerald: {
    container: "bg-surface-track",
    active: "bg-white text-emerald-800 shadow-sm",
    idle: "text-ink-2 hover:text-ink-1",
    focus: "focus-ring-emerald",
  },
};

type Props = {
  options: PillOption[];
  value: string;
  onChange: (v: string) => void;
  /** Visual accent. Defaults to the app-wide blue; use "emerald" inside the luxury Plan surfaces. */
  accent?: Accent;
};

export default function PillGroup({ options, value, onChange, accent = "blue" }: Props) {
  const theme = ACCENT[accent];

  function handleKeyDown(e: React.KeyboardEvent, idx: number) {
    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); next = (idx + 1) % options.length; }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); next = (idx - 1 + options.length) % options.length; }
    else return;
    onChange(options[next].key);
  }

  return (
    <div className={`flex items-center gap-0.5 rounded-full p-0.5 shrink-0 ${theme.container}`} role="radiogroup" aria-orientation="horizontal">
      {options.map((o, i) => (
        <button
          key={o.key}
          role="radio"
          aria-checked={value === o.key}
          tabIndex={value === o.key ? 0 : -1}
          onClick={() => onChange(o.key)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-colors whitespace-nowrap ${theme.focus} ${
            value === o.key ? theme.active : theme.idle
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
