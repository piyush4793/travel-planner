import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Force the mobile branch of every breakpoint-aware surface under test. jsdom's
// matchMedia otherwise resolves to "desktop", so the Plan wizard's mobile chrome
// (compact header + Review bottom bar) would never render.
vi.mock("@/hooks/useBreakpoint.ts", () => ({ useBreakpoint: () => "mobile" }));

import PlanTripHeader, { type HeaderStep } from "@/components/views/plan/shell/PlanTripHeader";
import PlanWorkspaceShell, { type RailDef } from "@/components/views/plan/shell/PlanWorkspaceShell";
import type { Country } from "@/core/types.ts";

const steps: HeaderStep[] = [
  { key: "basics", short: "Basics", title: "The basics" },
  { key: "cities", short: "Places", title: "Pick places" },
  { key: "review", short: "Review", title: "Your trip" },
];

const c = (name: string): Country => ({ name, lat: 0, lng: 0, bestMonths: [], budget: "", experiences: [] });

function renderHeader(props: Partial<React.ComponentProps<typeof PlanTripHeader>> = {}) {
  return render(
    <PlanTripHeader
      selection={[c("Norway"), c("Denmark"), c("Sweden")]}
      routeStopLimit={2}
      steps={steps}
      activeStep={2}
      onGoToStep={vi.fn()}
      width="review"
      {...props}
    />,
  );
}

describe("mobile Plan header (compact chrome)", () => {
  it("names only the first stop and folds the rest into a +N pill", () => {
    renderHeader();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Norway");
    // Later stops are dropped from the visible title on mobile (space); the full
    // route stays in the accessible name.
    expect(h1).not.toHaveTextContent("Denmark");
    expect(h1).toHaveAttribute("aria-label", "Planning a route through Norway, Denmark, Sweden");
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("renders the basis control icon-only while keeping it announced", () => {
    const onBasisChange = vi.fn();
    renderHeader({ basis: "couple", onBasisChange });
    const trigger = screen.getByRole("button", { name: /Who's going/i });
    expect(trigger).toHaveAccessibleName("Who's going — Couple");
    expect(trigger).not.toHaveTextContent("Couple");
  });

  it("hides the stepper on mobile across every step", () => {
    const { rerender } = renderHeader({ activeStep: 2 });
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();

    rerender(
      <PlanTripHeader
        selection={[c("Norway"), c("Denmark"), c("Sweden")]}
        routeStopLimit={2}
        steps={steps}
        activeStep={0}
        onGoToStep={vi.fn()}
        width="narrow"
      />,
    );
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });
});

const context: RailDef = {
  key: "context",
  title: "Insights",
  reopenLabel: "Insights",
  mobileLabel: "Insights",
  node: <p>context-content</p>,
};

const shape: RailDef = {
  key: "shape",
  title: "Shape your trip",
  reopenLabel: "Shape",
  mobileLabel: "✏️ Shape trip",
  node: <p>shape-content</p>,
};

describe("mobile Review bottom bar", () => {
  beforeEach(() => window.localStorage.clear());

  it("renders Back + Plan another as compact icon buttons beside the rail trigger and wires them", () => {
    const onBack = vi.fn();
    const onPlanAnother = vi.fn();
    render(
      <PlanWorkspaceShell center={<p>route-canvas</p>} context={context} nav={{ onBack, onPlanAnother }} />,
    );
    const back = screen.getByRole("button", { name: "Back to the previous step" });
    const planAnother = screen.getByRole("button", { name: "Plan another trip" });
    // Compact icon-only so the bar stays one line at 375px — the label lives in aria-label.
    expect(back).not.toHaveTextContent("Back");
    expect(planAnother).not.toHaveTextContent("Plan another");
    fireEvent.click(back);
    fireEvent.click(planAnother);
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onPlanAnother).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Insights/ })).toBeInTheDocument();
  });

  it("keeps the Plan-another button reachable by its accessible name (multi-country)", () => {
    render(
      <PlanWorkspaceShell center={<p>route</p>} context={context} nav={{ onBack: vi.fn(), onPlanAnother: vi.fn() }} />,
    );
    expect(screen.getByRole("button", { name: "Plan another trip" })).toBeInTheDocument();
  });

  it("omits the nav buttons when no nav is supplied", () => {
    render(<PlanWorkspaceShell center={<p>route</p>} shape={shape} context={context} />);
    expect(screen.queryByRole("button", { name: "Back to the previous step" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Plan another trip" })).not.toBeInTheDocument();
  });
});

describe("mobile Actions sheet", () => {
  beforeEach(() => window.localStorage.clear());

  it("does not render a More trigger when no actions node is supplied", () => {
    render(<PlanWorkspaceShell center={<p>route</p>} context={context} nav={{ onBack: vi.fn(), onPlanAnother: vi.fn() }} />);
    expect(screen.queryByRole("button", { name: /Tools/ })).not.toBeInTheDocument();
  });

  it("opens the More bottom-sheet with its actions node and closes on ✕", () => {
    render(
      <PlanWorkspaceShell
        center={<p>route</p>}
        context={context}
        actions={<button type="button">Export this itinerary as a PDF</button>}
        nav={{ onBack: vi.fn(), onPlanAnother: vi.fn() }}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Tools — PDF export, AI plan, cinematic" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("heading", { name: "Tools" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export this itinerary as a PDF" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
    expect(screen.getByRole("button", { name: "Tools — PDF export, AI plan, cinematic" })).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the Tools sheet after a tool action is tapped (so it can't stay open over a launched overlay)", () => {
    const onCinematic = vi.fn();
    render(
      <PlanWorkspaceShell
        center={<p>route</p>}
        context={context}
        actions={<button type="button" onClick={onCinematic}>Watch the animated cinematic journey</button>}
        nav={{ onBack: vi.fn(), onPlanAnother: vi.fn() }}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Tools — PDF export, AI plan, cinematic" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: "Watch the animated cinematic journey" }));
    // Action fires AND the sheet dismisses itself.
    expect(onCinematic).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
