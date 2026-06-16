type PillOption = { key: string; label: string };

type Props = {
  options: PillOption[];
  value: string;
  onChange: (v: string) => void;
};

export default function PillGroup({ options, value, onChange }: Props) {
  function handleKeyDown(e: React.KeyboardEvent, idx: number) {
    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); next = (idx + 1) % options.length; }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); next = (idx - 1 + options.length) % options.length; }
    else return;
    onChange(options[next].key);
  }

  return (
    <div className="flex items-center gap-0.5 bg-gray-100 rounded-full p-0.5 shrink-0" role="tablist" aria-orientation="horizontal">
      {options.map((o, i) => (
        <button
          key={o.key}
          role="tab"
          aria-selected={value === o.key}
          tabIndex={value === o.key ? 0 : -1}
          onClick={() => onChange(o.key)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap focus-ring ${
            value === o.key
              ? "bg-white text-blue-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
