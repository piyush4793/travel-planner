import { memo } from "react";
import type { PlanBuilder } from "../../../hooks/usePlanBuilder";
import CityCard from "../../country/panel/CityCard";
import DayLengthControl from "./DayLengthControl";
import RailSection from "./RailSection";

type Props = {
  builder: PlanBuilder;
};

/**
 * Left "Shape your trip" rail — the levers that regenerate the itinerary:
 * focus experiences, the city picker (auto → explicit), and trip length. Each
 * is a self-contained accordion so the rail stays light; editing here refreshes
 * the centre itinerary live, so the traveller never steps back through the
 * funnel. Purely presentational — all state lives in `usePlanBuilder`.
 */
function ShapeRailInner({ builder }: Props) {
  const experiences = builder.displayCountry?.experiences ?? [];
  const cities = builder.orderedCities;

  return (
    <div className="space-y-2.5">
      {experiences.length > 0 && (
        <RailSection title="Focus" hint="what you're into" count={experiences.length} defaultOpen>
          <p className="mb-2 text-[11px] text-[#6f6a5d]">Shapes the itinerary toward what you pick.</p>
          <div className="flex flex-wrap gap-1.5">
            {experiences.map((exp) => {
              const active = builder.selectedExperiences.includes(exp);
              return (
                <button
                  key={exp}
                  type="button"
                  onClick={() => builder.toggleExperience(exp)}
                  aria-pressed={active}
                  className={`focus-ring-emerald min-h-[32px] rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                    active
                      ? "border-emerald-700 bg-emerald-700 text-white shadow-sm"
                      : "border-[#e4dece] bg-white text-[#1e2a25] hover:border-emerald-500 hover:text-emerald-800"
                  }`}
                >
                  {exp}
                </button>
              );
            })}
          </div>
          {builder.selectedExperiences.length > 0 && (
            <button
              type="button"
              onClick={builder.clearExperiences}
              className="focus-ring-emerald mt-2 rounded text-[11px] font-semibold text-[#a09a89] transition-colors hover:text-[#6f6a5d]"
            >
              Clear ({builder.selectedExperiences.length})
            </button>
          )}
        </RailSection>
      )}

      {cities.length > 0 && (
        <RailSection title="Cities" hint="auto-picked · tap to tune" count={cities.length}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-medium text-[#6f6a5d]">
              {builder.selectedCities.length > 0
                ? `${builder.selectedCities.length} hand-picked`
                : `Auto-picked ${builder.autoSelectedCities.length}`}
            </p>
            {builder.selectedCities.length > 0 && (
              <button
                type="button"
                onClick={builder.clearCities}
                className="focus-ring-emerald rounded text-[11px] font-semibold text-[#6f6a5d] transition-colors hover:text-emerald-800"
              >
                Reset to auto
              </button>
            )}
          </div>
          <div className="max-h-[22rem] space-y-2 overflow-y-auto pr-0.5">
            {cities.map((city) => {
              const checked =
                builder.selectedCities.length > 0
                  ? builder.selectedCities.includes(city.name)
                  : builder.autoSelectedCities.includes(city.name);
              return (
                <CityCard
                  key={city.name}
                  city={city}
                  selectable
                  variant="luxury"
                  selected={checked}
                  onToggle={() => builder.toggleCity(city.name)}
                  activeExperiences={builder.selectedExperiences}
                />
              );
            })}
          </div>
        </RailSection>
      )}

      <RailSection title="Trip length" hint={`${builder.customDays} days`} defaultOpen>
        <DayLengthControl
          days={builder.customDays}
          maxDays={builder.safeMaxDays}
          recommendedDays={builder.recommendedDays}
          daysPinned={builder.daysPinned}
          handPickedCities={builder.selectedCities}
          currentCities={builder.planCities}
          moreCitiesAvailable={builder.orderedCities.length > builder.planCities.length}
          projectCities={builder.projectCities}
          onCommit={builder.setDays}
          onReset={builder.resetDays}
        />
      </RailSection>
    </div>
  );
}

const ShapeRail = memo(ShapeRailInner);
export default ShapeRail;
