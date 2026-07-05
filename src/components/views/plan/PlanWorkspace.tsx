import { memo, useEffect, useState } from "react";
import { useBreakpoint } from "../../../hooks/useBreakpoint";
import { useBackDismiss } from "../../../hooks/useBackDismiss";
import { loadLS, saveLS } from "../../../core/storage";
import { LS_KEYS } from "../../../core/lsKeys";
import type { PlanBuilder } from "../../../hooks/usePlanBuilder";
import type { BudgetBasis } from "../../../core/utils/budget";
import type { PlanActions } from "./planActions";
import ShapeRail from "./ShapeRail";
import ContextRail from "./ContextRail";
import PlanPreviewPane from "./PlanPreviewPane";

type RailUiState = { left: boolean; right: boolean };
const DEFAULT_UI: RailUiState = { left: true, right: true };

type Props = {
  builder: PlanBuilder;
  budgetBasis: BudgetBasis;
  setBudgetBasis: (b: BudgetBasis) => void;
  homeCountry: string;
  actions: PlanActions;
  onPlanWithAi?: () => void;
  onCinematic?: () => void;
};

type Rail = "shape" | "context";
const RAIL_TITLE: Record<Rail, string> = { shape: "Shape your trip", context: "Good to know" };

function RailHeader({ title, side, onCollapse }: { title: string; side: "left" | "right"; onCollapse: () => void }) {
  const chevron = side === "left" ? "‹" : "›";
  return (
    <div className="flex shrink-0 items-center gap-2 px-1 pb-2">
      <h2 className="font-display text-sm font-semibold tracking-tight text-[#16241d]">{title}</h2>
      <button
        type="button"
        onClick={onCollapse}
        aria-label={`Collapse ${title} panel`}
        className="focus-ring-emerald ml-auto flex h-7 w-7 items-center justify-center rounded-full border border-[#e4dece] bg-white text-sm font-bold text-[#6f6a5d] transition-colors hover:bg-[#f4f1e8]"
      >
        <span aria-hidden="true">{chevron}</span>
      </button>
    </div>
  );
}

function ReopenTab({ label, side, onOpen }: { label: string; side: "left" | "right"; onOpen: () => void }) {
  const chevron = side === "left" ? "›" : "‹";
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Show ${label} panel`}
      aria-expanded={false}
      className="focus-ring-emerald flex w-9 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-[#e4dece] bg-white py-3 text-[#6f6a5d] shadow-[0_1px_3px_rgba(20,40,30,0.05)] transition-colors hover:bg-[#f4f1e8]"
    >
      <span aria-hidden="true" className="text-sm font-bold">{chevron}</span>
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] [writing-mode:vertical-rl]">{label}</span>
    </button>
  );
}

/**
 * The Review "planning workspace": inputs (left rail) → itinerary (centre) →
 * reference (right rail). Desktop shows all three inline with collapsible rails;
 * tablet/mobile focus the itinerary and surface each rail as a bottom-sheet
 * drawer from a sticky action bar, so the layout never squeezes the itinerary on
 * small screens. Rail collapse state persists across refreshes.
 */
function PlanWorkspaceInner({ builder, budgetBasis, setBudgetBasis, homeCountry, actions, onPlanWithAi, onCinematic }: Props) {
  const bp = useBreakpoint();
  const isDesktop = bp === "desktop";

  const [ui, setUi] = useState<RailUiState>(() => loadLS(LS_KEYS.PLAN_UI, DEFAULT_UI));
  useEffect(() => { saveLS(LS_KEYS.PLAN_UI, ui); }, [ui]);

  const [sheet, setSheet] = useState<Rail | null>(null);
  const closeSheet = useBackDismiss(sheet !== null, () => setSheet(null));

  // Escape closes the mobile drawer (back button handled by useBackDismiss).
  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeSheet(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet, closeSheet]);

  // Collapse rails to sheets when leaving desktop so state stays coherent.
  useEffect(() => { if (isDesktop) setSheet(null); }, [isDesktop]);

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

  const shapeRail = <ShapeRail builder={builder} />;
  const contextRail = (
    <ContextRail
      country={displayCountry}
      activeBasis={budgetBasis}
      onBasisChange={setBudgetBasis}
      homeCountry={homeCountry}
      actions={actions}
    />
  );

  if (isDesktop) {
    return (
      <div className="flex h-full w-full gap-3 overflow-hidden">
        {ui.left ? (
          <aside aria-label={RAIL_TITLE.shape} className="flex w-[300px] shrink-0 flex-col overflow-hidden">
            <RailHeader title={RAIL_TITLE.shape} side="left" onCollapse={() => setUi((u) => ({ ...u, left: false }))} />
            <div className="flex-1 overflow-y-auto pr-0.5">{shapeRail}</div>
          </aside>
        ) : (
          <ReopenTab label="Shape" side="left" onOpen={() => setUi((u) => ({ ...u, left: true }))} />
        )}

        <main className="min-w-0 flex-1 overflow-hidden">{center}</main>

        {ui.right ? (
          <aside aria-label={RAIL_TITLE.context} className="flex w-[300px] shrink-0 flex-col overflow-hidden">
            <RailHeader title={RAIL_TITLE.context} side="right" onCollapse={() => setUi((u) => ({ ...u, right: false }))} />
            <div className="flex-1 overflow-y-auto pr-0.5">{contextRail}</div>
          </aside>
        ) : (
          <ReopenTab label="Details" side="right" onOpen={() => setUi((u) => ({ ...u, right: true }))} />
        )}
      </div>
    );
  }

  // Tablet / mobile: itinerary is the whole screen; rails open as bottom sheets.
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <main className="min-h-0 flex-1 overflow-hidden">{center}</main>

      <div className="grid shrink-0 grid-cols-2 gap-2 pt-2.5">
        <button
          type="button"
          onClick={() => setSheet("shape")}
          aria-haspopup="dialog"
          aria-expanded={sheet === "shape"}
          className="focus-ring-emerald flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-[#e4dece] bg-white px-3 py-2 text-xs font-bold text-[#1e2a25] shadow-sm transition-colors hover:bg-[#f4f1e8]"
        >
          ✏️ Shape trip
        </button>
        <button
          type="button"
          onClick={() => setSheet("context")}
          aria-haspopup="dialog"
          aria-expanded={sheet === "context"}
          className="focus-ring-emerald flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-[#e4dece] bg-white px-3 py-2 text-xs font-bold text-[#1e2a25] shadow-sm transition-colors hover:bg-[#f4f1e8]"
        >
          📌 Good to know
        </button>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={RAIL_TITLE[sheet]}>
          <button
            type="button"
            aria-label="Dismiss panel"
            onClick={() => closeSheet()}
            className="absolute inset-0 bg-black/40 motion-safe:animate-[fadeInUp_0.15s_ease-out]"
          />
          <div className="relative max-h-[82vh] overflow-y-auto rounded-t-3xl border-t border-[#e4dece] bg-[#f7f4ec] px-3 pb-8 pt-3 shadow-2xl safe-bottom motion-safe:animate-[slideUp_0.2s_ease-out]">
            <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-[#d8d2c2]" aria-hidden="true" />
            <div className="mb-2.5 flex items-center justify-between px-1">
              <h3 className="font-display text-base font-semibold tracking-tight text-[#16241d]">{RAIL_TITLE[sheet]}</h3>
              <button
                type="button"
                onClick={() => closeSheet()}
                aria-label="Close panel"
                className="focus-ring-emerald flex h-8 w-8 items-center justify-center rounded-full border border-[#e4dece] bg-white text-sm font-bold text-[#6f6a5d] transition-colors hover:bg-[#f4f1e8]"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
            {sheet === "shape" ? shapeRail : contextRail}
          </div>
        </div>
      )}
    </div>
  );
}

const PlanWorkspace = memo(PlanWorkspaceInner);
export default PlanWorkspace;
