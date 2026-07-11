import { memo } from "react";
import type { PlanBuilder } from "../../../hooks/usePlanBuilder";
import type { BudgetBasis } from "../../../core/utils/budget";
import type { PlanActions } from "./planActions";
import ShapeRail from "./ShapeRail";
import ContextRail from "./ContextRail";
import PlanPreviewPane from "./PlanPreviewPane";
import PlanWorkspaceShell, { type RailDef } from "./PlanWorkspaceShell";

type Props = {
  builder: PlanBuilder;
  budgetBasis: BudgetBasis;
  setBudgetBasis: (b: BudgetBasis) => void;
  homeCountry: string;
  actions: PlanActions;
  onPlanWithAi?: () => void;
  onCinematic?: () => void;
};

/**
 * Single-country Review workspace: levers (Shape rail) → live itinerary (centre)
 * → reference (Good to know rail), laid out by the shared {@link PlanWorkspaceShell}.
 * The multi-country route uses {@link TripReviewWorkspace} instead; both share the
 * shell so the responsive chrome never forks.
 */
function PlanWorkspaceInner({ builder, budgetBasis, setBudgetBasis, homeCountry, actions, onPlanWithAi, onCinematic }: Props) {
  const { displayCountry, plan, rule } = builder;
  if (!displayCountry || !plan) return null;

  const center = (
    <PlanPreviewPane
      country={displayCountry}
      plan={plan}
      rule={rule}
      homeCountry={homeCountry}
      onPlanWithAi={onPlanWithAi}
      onCinematic={onCinematic}
    />
  );

  const shape: RailDef = {
    key: "shape",
    title: "Shape your trip",
    reopenLabel: "Shape",
    mobileLabel: "✏️ Shape trip",
    node: <ShapeRail builder={builder} />,
  };
  const context: RailDef = {
    key: "context",
    title: "Good to know",
    reopenLabel: "Details",
    mobileLabel: "📌 Good to know",
    node: (
      <ContextRail
        country={displayCountry}
        activeBasis={budgetBasis}
        onBasisChange={setBudgetBasis}
        homeCountry={homeCountry}
        actions={actions}
      />
    ),
  };

  return <PlanWorkspaceShell center={center} shape={shape} context={context} />;
}

const PlanWorkspace = memo(PlanWorkspaceInner);
export default PlanWorkspace;
