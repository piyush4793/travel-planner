import FilterChip from "./FilterChip";

type Props = {
  allExperiences: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
};

export default function ExperienceDropdown({ allExperiences, selected, onChange }: Props) {
  function toggle(exp: string) {
    onChange(selected.includes(exp) ? selected.filter(e => e !== exp) : [...selected, exp]);
  }

  const label = selected.length > 0 ? `Experiences (${selected.length})` : "Experiences";

  return (
    <FilterChip label={label} active={selected.length > 0}>
      {() => (
        <div className="p-3 w-72">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
            Filter by experience
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto">
            {allExperiences.map((exp) => (
              <button
                key={exp}
                onClick={() => toggle(exp)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  selected.includes(exp)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {exp}
              </button>
            ))}
          </div>
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="mt-3 w-full text-xs text-red-500 hover:text-red-600 font-semibold"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </FilterChip>
  );
}
