import { memo, useEffect, useState, type ReactNode } from "react";
import { useBreakpoint } from "../../../hooks/useBreakpoint";
import ModalShell from "../../shared/ModalShell";
import { loadLS, saveLS } from "../../../core/storage";
import { LS_KEYS } from "../../../core/lsKeys";

/** A collapsible reference rail: a stable key, a heading, and its content. */
export type RailDef = {
  key: string;
  /** Panel heading (desktop rail header + mobile sheet title). */
  title: string;
  /** Short label for the collapsed desktop reopen tab (vertical text). */
  reopenLabel: string;
  /** Label for the mobile bottom-sheet trigger button. */
  mobileLabel: string;
  node: ReactNode;
};

type RailUiState = { left: boolean; right: boolean };
const DEFAULT_UI: RailUiState = { left: true, right: true };

/** Mobile-only itinerary navigation, rendered in the workspace's bottom bar
 *  beside the rail triggers. On desktop these live in the wizard footer, so the
 *  shell only needs them below `lg`, where that footer is hidden. */
export type WorkspaceNav = { onBack: () => void; onPlanAnother: () => void };

type Props = {
  center: ReactNode;
  /** Left "levers" rail (optional — the multi-country canvas tunes in place). */
  shape?: RailDef;
  /** Right "reference" rail. */
  context: RailDef;
  /** Mobile bottom-bar Back / Plan-another (desktop uses the wizard footer). */
  nav?: WorkspaceNav;
};

function RailHeader({ title, side, onCollapse }: { title: string; side: "left" | "right"; onCollapse: () => void }) {
  const chevron = side === "left" ? "‹" : "›";
  return (
    <div className="flex shrink-0 items-center gap-2 px-1 pb-2">
      <h2 className="font-display text-sm font-semibold tracking-tight text-ink-1">{title}</h2>
      <button
        type="button"
        onClick={onCollapse}
        aria-label={`Collapse ${title} panel`}
        className="focus-ring-emerald ml-auto flex h-7 w-7 items-center justify-center rounded-full border border-line bg-white text-sm font-bold text-ink-2 transition-colors hover:bg-surface-2"
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
      className="focus-ring-emerald flex w-9 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-white py-3 text-ink-2 shadow-[0_1px_3px_rgba(20,40,30,0.05)] transition-colors hover:bg-surface-2"
    >
      <span aria-hidden="true" className="text-sm font-bold">{chevron}</span>
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] [writing-mode:vertical-rl]">{label}</span>
    </button>
  );
}

/**
 * The Review "planning workspace" shell: inputs (optional left rail) → itinerary
 * (centre) → reference (right rail). Desktop shows the rails inline with
 * collapse-to-reopen tabs (state persisted); tablet/mobile focus the itinerary
 * and surface each rail as a bottom-sheet drawer from a sticky action bar. Purely
 * presentational so both the single-country (with a Shape rail) and multi-country
 * Route Canvas (levers inline, no Shape rail) reuse one layout without forking
 * the responsive chrome.
 */
function PlanWorkspaceShellInner({ center, shape, context, nav }: Props) {
  const bp = useBreakpoint();
  const isDesktop = bp === "desktop";

  const [ui, setUi] = useState<RailUiState>(() => loadLS(LS_KEYS.PLAN_UI, DEFAULT_UI));
  useEffect(() => { saveLS(LS_KEYS.PLAN_UI, ui); }, [ui]);

  const [sheet, setSheet] = useState<string | null>(null);
  const closeSheet = () => setSheet(null);

  useEffect(() => { if (isDesktop) setSheet(null); }, [isDesktop]);

  const rails: RailDef[] = shape ? [shape, context] : [context];
  const activeRail = rails.find((r) => r.key === sheet) ?? null;

  if (isDesktop) {
    return (
      <div className="flex h-full w-full gap-3 overflow-hidden">
        {shape &&
          (ui.left ? (
            <aside aria-label={shape.title} className="flex w-[300px] shrink-0 flex-col overflow-hidden">
              <RailHeader title={shape.title} side="left" onCollapse={() => setUi((u) => ({ ...u, left: false }))} />
              <div className="flex-1 overflow-y-auto pr-0.5">{shape.node}</div>
            </aside>
          ) : (
            <ReopenTab label={shape.reopenLabel} side="left" onOpen={() => setUi((u) => ({ ...u, left: true }))} />
          ))}

        <main className="min-w-0 flex-1 overflow-hidden">{center}</main>

        {ui.right ? (
          <aside aria-label={context.title} className="flex w-[300px] shrink-0 flex-col overflow-hidden">
            <RailHeader title={context.title} side="right" onCollapse={() => setUi((u) => ({ ...u, right: false }))} />
            <div className="flex-1 overflow-y-auto pr-0.5">{context.node}</div>
          </aside>
        ) : (
          <ReopenTab label={context.reopenLabel} side="right" onOpen={() => setUi((u) => ({ ...u, right: true }))} />
        )}
      </div>
    );
  }

  // Tablet / mobile: itinerary is the whole screen; rails open as bottom sheets.
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <main className="min-h-0 flex-1 overflow-hidden">{center}</main>

      <div className="flex shrink-0 items-center gap-2 pb-safe pt-2.5">
        {nav && (
          <button
            type="button"
            onClick={nav.onBack}
            aria-label="Back to the previous step"
            className="focus-ring-emerald flex min-h-[44px] shrink-0 items-center gap-1 rounded-full border border-line bg-white px-3.5 text-xs font-bold text-ink-2 shadow-sm transition-colors hover:bg-surface-2"
          >
            <span aria-hidden="true">←</span> Back
          </button>
        )}
        {rails.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setSheet(r.key)}
            aria-haspopup="dialog"
            aria-expanded={sheet === r.key}
            className="focus-ring-emerald flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-1.5 truncate rounded-full border border-line bg-white px-3 py-2 text-xs font-bold text-ink-1 shadow-sm transition-colors hover:bg-surface-2"
          >
            {r.mobileLabel}
          </button>
        ))}
        {nav && (
          <button
            type="button"
            onClick={nav.onPlanAnother}
            aria-label="Plan another trip"
            className="focus-ring-emerald flex min-h-[44px] shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 text-xs font-bold text-emerald-800 shadow-sm transition-colors hover:bg-emerald-100"
          >
            <span aria-hidden="true">＋</span>
            <span className={rails.length > 1 ? "sr-only" : undefined}>Plan another</span>
          </button>
        )}
      </div>

      <ModalShell
        open={activeRail !== null}
        onClose={closeSheet}
        label={activeRail?.title}
        backdropClassName="bg-black/50 backdrop-blur-sm"
        className="relative flex max-h-[85vh] w-full flex-col self-end overflow-hidden rounded-t-3xl border-t border-emerald-100 bg-white shadow-2xl focus:outline-none safe-bottom motion-safe:animate-[slideUp_0.2s_ease-out]"
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong" aria-hidden="true" />
        <div className="flex shrink-0 items-center gap-2.5 border-b border-emerald-100 bg-gradient-to-b from-emerald-50 to-white px-4 py-3">
          <h3 className="min-w-0 flex-1 font-display text-[15px] font-bold leading-tight text-emerald-950">{activeRail?.title}</h3>
          <button
            type="button"
            onClick={closeSheet}
            aria-label="Close panel"
            className="focus-ring-emerald flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100 transition-colors hover:bg-white"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">{activeRail?.node}</div>
      </ModalShell>
    </div>
  );
}

const PlanWorkspaceShell = memo(PlanWorkspaceShellInner);
export default PlanWorkspaceShell;
