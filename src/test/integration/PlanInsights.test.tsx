import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PlanInsights from "../../components/views/plan/PlanInsights";
import type { Country } from "../../core/types";

const base: Country = {
  name: "Norway",
  lat: 60,
  lng: 8,
  bestMonths: ["June", "July"],
  worstMonths: ["January"],
  budget: "₹3L",
  experiences: ["Fjords"],
  travelStyle: ["explorer"],
  avoid: ["Costly alcohol", "Short winter daylight"],
  combo: ["Sweden"],
  stopoverNote: "Pair with a Helsinki stopover.",
};

describe("PlanInsights", () => {
  it("renders when-to-go, stopover, watch-outs and combine chips", () => {
    render(<PlanInsights country={base} />);
    expect(screen.getByText("Good to know")).toBeInTheDocument();
    expect(screen.getByText("Jun")).toBeInTheDocument();
    expect(screen.getByTitle("Best avoided in January")).toBeInTheDocument();
    expect(screen.getByText("Pair with a Helsinki stopover.")).toBeInTheDocument();
    expect(screen.getByText("Costly alcohol")).toBeInTheDocument();
    expect(screen.getByText("Sweden")).toBeInTheDocument();
  });

  it("opens a combine-with destination when a handler is supplied", () => {
    const onOpenCombo = vi.fn();
    render(<PlanInsights country={base} onOpenCombo={onOpenCombo} />);
    fireEvent.click(screen.getByRole("button", { name: "Sweden" }));
    expect(onOpenCombo).toHaveBeenCalledWith("Sweden");
  });

  it("renders combine values as static chips without a handler", () => {
    render(<PlanInsights country={base} />);
    expect(screen.queryByRole("button", { name: "Sweden" })).not.toBeInTheDocument();
    expect(screen.getByText("Sweden")).toBeInTheDocument();
  });

  it("renders nothing when the country carries no insight data", () => {
    const bare: Country = { name: "Nowhere", lat: 0, lng: 0, bestMonths: [], budget: "₹1L", experiences: [] };
    const { container } = render(<PlanInsights country={bare} />);
    expect(container).toBeEmptyDOMElement();
  });
});
