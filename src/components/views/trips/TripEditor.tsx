import { memo, useEffect, useRef, useState } from "react";
import { ALL_REGIONS, type Region, type TripGroupDef } from "../../../core/data/tripGroups";

type TripEditorProps = {
  initial: TripGroupDef | null;
  isSeedTrip?: boolean;
  allCountryNames: string[];
  countryRegionMap: Record<string, string>;
  assignedNames: Set<string>;
  currentTripNames: string[];
  onSave: (group: TripGroupDef) => void;
  onCancel: () => void;
  onReset?: () => void;
};

function TripEditorBase({
  initial,
  isSeedTrip,
  allCountryNames,
  countryRegionMap,
  assignedNames,
  currentTripNames,
  onSave,
  onCancel,
  onReset,
}: TripEditorProps) {
  const mainLocked = !!isSeedTrip && !!initial;
  const [main, setMain] = useState(initial?.main ?? "");
  const [addOns, setAddOns] = useState<string[]>(initial?.addOns ?? []);
  const [region, setRegion] = useState<Region>(initial?.region ?? (countryRegionMap[initial?.main ?? ""] as Region) ?? "Asia");
  const [addOnSearch, setAddOnSearch] = useState("");

  const currentSet = new Set(currentTripNames);
  const sorted = [...allCountryNames].sort();

  // Available for main: not assigned elsewhere, filtered by selected region
  const availableMain = sorted.filter(
    (n) => (!assignedNames.has(n) || currentSet.has(n) || n === main) &&
           (countryRegionMap[n] === region || n === main)
  );

  // Available for add-ons: not assigned elsewhere, not main, filtered by region
  const availableAddOns = sorted.filter(
    (n) => n !== main && (!assignedNames.has(n) || currentSet.has(n) || addOns.includes(n)) &&
           (countryRegionMap[n] === region || addOns.includes(n))
  );

  const filteredAddOns = addOnSearch.trim()
    ? availableAddOns.filter((n) => n.toLowerCase().includes(addOnSearch.toLowerCase()))
    : availableAddOns;

  const toggleAddOn = (name: string) => {
    setAddOns((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : prev.length < 2 ? [...prev, name] : prev
    );
  };

  const canSave = main.trim() !== "";

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  // Dirty check: don't save if nothing changed (avoids marking seed trips as custom)
  const isDirty = !initial ||
    main !== initial.main ||
    region !== initial.region ||
    addOns.length !== (initial.addOns?.length ?? 0) ||
    addOns.some((a, i) => a !== initial.addOns?.[i]);

  // If main is changed and was an add-on, remove it
  const handleMainChange = (newMain: string) => {
    setMain(newMain);
    setAddOns((prev) => prev.filter((n) => n !== newMain));
    if (countryRegionMap[newMain]) {
      setRegion(countryRegionMap[newMain] as Region);
    }
  };

  return (
    <div
      className="rounded-xl border-2 border-blue-300 bg-blue-50/50 p-4 space-y-3"
      tabIndex={-1}
      ref={rootRef}
      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onCancel(); } }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-xs font-bold text-blue-700">
          {initial ? (mainLocked ? "Customize Trip" : "Edit Trip") : "New Trip"}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {onReset && (
            <button
              onClick={onReset}
              className="text-[10px] font-medium text-amber-600 hover:text-amber-700 px-2 py-1 rounded hover:bg-amber-50 transition-colors"
            >
              ↩ Reset
            </button>
          )}
          <button
            onClick={onCancel}
            className="text-[10px] font-medium text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => canSave && isDirty && onSave({ main, addOns, region })}
            disabled={!canSave || !isDirty}
            className={`text-[10px] font-semibold px-3 py-1 rounded-lg transition-colors ${
              canSave && isDirty
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Save
          </button>
        </div>
      </div>

      <div className={mainLocked ? "grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3" : "grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3"}>
        {/* Main country */}
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
            Main Country
          </label>
          {mainLocked ? (
            <div className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50 text-gray-600 font-medium">
              {main}
            </div>
          ) : (
            <select
              value={main}
              onChange={(e) => handleMainChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:border-blue-300 focus:outline-none"
            >
              <option value="">Select…</option>
              {availableMain.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          )}
        </div>

        {/* Region — hidden for seed trips (auto-derived) */}
        {!mainLocked && (
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
              Region
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value as Region)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:border-blue-300 focus:outline-none"
            >
              {ALL_REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        )}

        {/* Add-on count badge */}
        <div className="flex items-end pb-0.5">
          <span className="text-[10px] font-medium text-gray-400">
            {addOns.length}/2 add-ons
          </span>
        </div>
      </div>

      {/* Add-on selector */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
            Add-on Countries (max 2)
          </label>
          {addOns.length > 0 && (
            <button
              onClick={() => setAddOns([])}
              className="text-[10px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
        {/* Selected add-ons as removable chips */}
        {addOns.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {addOns.map((n) => (
              <button
                key={n}
                onClick={() => toggleAddOn(n)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
              >
                {n}
                <span className="text-blue-400 text-[10px]">✕</span>
              </button>
            ))}
          </div>
        )}

        {/* Search + scrollable list */}
        <input
          type="text"
          value={addOnSearch}
          onChange={(e) => setAddOnSearch(e.target.value)}
          placeholder="Search countries to add…"
          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:border-blue-300 focus:outline-none mb-1.5"
        />
        <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-100 bg-white">
          {filteredAddOns.length > 0 ? filteredAddOns.map((n) => {
            const isSelected = addOns.includes(n);
            const isDisabled = !isSelected && addOns.length >= 2;
            return (
              <button
                key={n}
                onClick={() => !isDisabled && toggleAddOn(n)}
                disabled={isDisabled}
                className={`w-full text-left px-3 py-1.5 text-xs border-b border-gray-50 last:border-0 transition-colors ${
                  isSelected
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : isDisabled
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {isSelected ? "✓ " : "  "}{n}
              </button>
            );
          }) : (
            <div className="px-3 py-2 text-xs text-gray-400">No matching countries</div>
          )}
        </div>
      </div>
    </div>
  );
}

const TripEditor = memo(TripEditorBase);
export default TripEditor;
