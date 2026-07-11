import { memo } from "react";
import type { CityEntry } from "../../../core/types";
import CityCard from "../../country/panel/CityCard";

type Props = {
  /** Cities in vibe-first order (experience matches surface first). */
  cities: CityEntry[];
  /** Hand-picked cities; empty means "follow the auto plan". */
  selectedCities: string[];
  /** Cities the auto plan visits — pre-checked when nothing is hand-picked. */
  autoSelectedCities: string[];
  /** Focused experiences — matching city tags are highlighted on each card. */
  activeExperiences: string[];
  onToggle: (city: string) => void;
  onClear: () => void;
};

/**
 * The "Cities" picker — auto-picked by default, tap to curate. Shared by the
 * single-country `ShapeRail` and each stop of the multi-country Route Canvas so
 * the selection model (auto → hand-picked → reset) reads identically (DRY).
 * Purely presentational — state lives in `usePlanBuilder`/`useTripPlanner`.
 */
function CityPickerInner({ cities, selectedCities, autoSelectedCities, activeExperiences, onToggle, onClear }: Props) {
  const handPicked = selectedCities.length > 0;
  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-medium text-[#6f6a5d]">
          {handPicked ? `${selectedCities.length} hand-picked` : `Auto-picked ${autoSelectedCities.length}`}
        </p>
        {handPicked && (
          <button
            type="button"
            onClick={onClear}
            className="focus-ring-emerald rounded text-[11px] font-semibold text-[#6f6a5d] transition-colors hover:text-emerald-800"
          >
            Reset to auto
          </button>
        )}
      </div>
      <div className="max-h-[22rem] space-y-2 overflow-y-auto pr-0.5">
        {cities.map((city) => {
          const checked = handPicked ? selectedCities.includes(city.name) : autoSelectedCities.includes(city.name);
          return (
            <CityCard
              key={city.name}
              city={city}
              selectable
              variant="luxury"
              selected={checked}
              onToggle={() => onToggle(city.name)}
              activeExperiences={activeExperiences}
            />
          );
        })}
      </div>
    </>
  );
}

const CityPicker = memo(CityPickerInner);
export default CityPicker;
