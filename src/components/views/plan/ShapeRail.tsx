import { memo } from "react";
import type { PlanBuilder } from "../../../hooks/usePlanBuilder";
import DayLengthControl from "./DayLengthControl";
import FocusChips from "./FocusChips";
import CityPicker from "./CityPicker";
import RailSection from "./RailSection";

type Props = {
  builder: PlanBuilder;
};

/**
 * Left "Shape your trip" rail — the levers that regenerate the itinerary:
 * focus experiences, the city picker (auto → explicit), and trip length. Each
 * is a self-contained accordion so the rail stays light; editing here refreshes
 * the centre itinerary live, so the traveller never steps back through the
 * funnel. Purely presentational — all state lives in `usePlanBuilder`. The chip
 * and city controls are shared with the multi-country Route Canvas segments.
 */
function ShapeRailInner({ builder }: Props) {
  const experiences = builder.displayCountry?.experiences ?? [];
  const cities = builder.orderedCities;

  return (
    <div className="space-y-2.5">
      {experiences.length > 0 && (
        <RailSection title="Focus" hint="what you're into" count={experiences.length} defaultOpen>
          <FocusChips
            options={experiences}
            selected={builder.selectedExperiences}
            onToggle={builder.toggleExperience}
            onClear={builder.clearExperiences}
          />
        </RailSection>
      )}

      {cities.length > 0 && (
        <RailSection title="Cities" hint="auto-picked · tap to tune" count={cities.length}>
          <CityPicker
            cities={cities}
            selectedCities={builder.selectedCities}
            autoSelectedCities={builder.autoSelectedCities}
            activeExperiences={builder.selectedExperiences}
            onToggle={builder.toggleCity}
            onClear={builder.clearCities}
          />
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
