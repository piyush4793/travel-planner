import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ContextRail from "../../components/views/plan/ContextRail";
import type { PlanActions } from "../../components/views/plan/planActions";
import type { Country } from "../../core/types";

const ACTIONS: PlanActions = {
  isVisited: false,
  isFavorite: false,
  aiPlanCount: 0,
  notes: "",
};

const FULL: Country = {
  name: "Norway",
  lat: 60,
  lng: 8,
  budget: "₹3L",
  experiences: ["Fjords"],
  budgetBreakdown: { solo: "₹2L", couple: "₹3L", family4: "₹5L" },
  bestMonths: ["June"],
  worstMonths: ["January"],
  stopoverNote: "Great add-on from a European hub.",
  avoid: ["Winter road closures"],
  combo: ["Sweden"],
};

const BARE: Country = {
  name: "Testland",
  lat: 0,
  lng: 0,
  budget: "₹1L",
  experiences: [],
  bestMonths: [],
};

describe("ContextRail — right reference rail", () => {
  it("always renders Budget and Before-you-go sections", () => {
    render(<ContextRail country={FULL} activeBasis="couple" onBasisChange={vi.fn()} homeCountry="India" actions={ACTIONS} />);
    expect(screen.getByRole("button", { name: /^Budget/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Before you go/i })).toBeInTheDocument();
  });

  it("renders Trip readiness at the top, and Notes when a save handler exists", () => {
    const onSaveNotes = vi.fn();
    render(<ContextRail country={FULL} activeBasis="couple" onBasisChange={vi.fn()} homeCountry="India" actions={{ ...ACTIONS, onSaveNotes }} />);
    expect(screen.getByRole("button", { name: /Trip readiness/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Notes/i })).toBeInTheDocument();
  });

  it("omits the Notes section without a save handler", () => {
    render(<ContextRail country={FULL} activeBasis="couple" onBasisChange={vi.fn()} homeCountry="India" actions={ACTIONS} />);
    expect(screen.queryByRole("button", { name: /^Notes/i })).not.toBeInTheDocument();
  });

  it("renders When-to-go and Good-to-know sections when the data exists", () => {
    render(<ContextRail country={FULL} activeBasis="couple" onBasisChange={vi.fn()} homeCountry="India" actions={ACTIONS} />);
    expect(screen.getByRole("button", { name: /When to go/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Good to know/i })).toBeInTheDocument();
  });

  it("omits When-to-go and Good-to-know when the destination lacks that data", () => {
    render(<ContextRail country={BARE} activeBasis="couple" onBasisChange={vi.fn()} homeCountry="India" actions={ACTIONS} />);
    expect(screen.queryByRole("button", { name: /When to go/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Good to know/i })).not.toBeInTheDocument();
    // Budget still renders, falling back to the single figure.
    expect(screen.getByRole("button", { name: /^Budget/i })).toBeInTheDocument();
  });
});
