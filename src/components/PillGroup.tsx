type PillOption = { key: string; label: string };

type Props = {
  options: PillOption[];
  value: string;
  onChange: (v: string) => void;
};

export default function PillGroup({ options, value, onChange }: Props) {
  return (
    <div className="flex items-center gap-0.5 bg-gray-100 rounded-full p-0.5 shrink-0">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all whitespace-nowrap ${
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
