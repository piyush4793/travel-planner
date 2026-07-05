import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import DestinationPicker from "../components/views/plan/DestinationPicker";
import { popularDestinations, byPopularity } from "../core/data/popularDestinations";
import type { Country } from "../core/types";

function mk(name: string, pop?: number): Country {
  return { name, lat: 0, lng: 0, bestMonths: [], budget: "", experiences: [], popularityScore: pop };
}

describe("popularDestinations", () => {
  it("returns plannable seeds sorted most-popular first", () => {
    const list = popularDestinations();
    expect(list.length).toBeGreaterThan(0);
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1].popularityScore ?? 0;
      const cur = list[i].popularityScore ?? 0;
      expect(prev).toBeGreaterThanOrEqual(cur);
    }
  });

  it("byPopularity ranks higher scores first, breaking ties by name", () => {
    const sorted = [mk("Zed", 10), mk("Alpha", 10), mk("Beta", 90)].sort(byPopularity);
    expect(sorted.map((c) => c.name)).toEqual(["Beta", "Alpha", "Zed"]);
  });
});

describe("DestinationPicker", () => {
  const explore = [mk("Explora", 80), mk("Wanderland", 70)];

  it("orders your list unvisited-first, each group by popularity", () => {
    const countries = [mk("Visited-High", 99), mk("Unvisited-Low", 5), mk("Unvisited-High", 90)];
    render(
      <DestinationPicker
        countries={countries}
        exploreCountries={explore}
        visitedNames={new Set(["Visited-High"])}
        onPick={vi.fn()}
        onGoDiscover={vi.fn()}
      />,
    );
    const section = screen.getByText(/From your list/i).closest("section")!;
    const names = within(section).getAllByRole("button").map((b) => b.textContent?.replace(/[^\x00-\x7F]/g, "").trim());
    expect(names).toEqual(["Unvisited-High", "Unvisited-Low", "Visited-High"]);
  });

  it("orders your list favorites → remaining → visited, each by popularity", () => {
    const countries = [
      mk("Fav-Low", 5),
      mk("Fav-High", 95),
      mk("Plain-High", 80),
      mk("Visited-High", 99),
    ];
    render(
      <DestinationPicker
        countries={countries}
        exploreCountries={explore}
        visitedNames={new Set(["Visited-High"])}
        favoriteNames={new Set(["Fav-Low", "Fav-High"])}
        onPick={vi.fn()}
        onGoDiscover={vi.fn()}
      />,
    );
    const section = screen.getByText(/From your list/i).closest("section")!;
    const names = within(section).getAllByRole("button").map((b) => b.textContent?.replace(/[^\x00-\x7F]/g, "").trim());
    expect(names).toEqual(["Fav-High", "Fav-Low", "Plain-High", "Visited-High"]);
  });

  it("caps the list at 8, reveals all, then collapses back", () => {
    const many = Array.from({ length: 11 }, (_, i) => mk(`Dest-${String(i).padStart(2, "0")}`, 100 - i));
    render(
      <DestinationPicker
        countries={many}
        exploreCountries={explore}
        visitedNames={new Set()}
        onPick={vi.fn()}
        onGoDiscover={vi.fn()}
      />,
    );
    const section = () => screen.getByText(/From your list/i).closest("section")!;
    // Capped at 8 chips + a "Show all 11" affordance.
    expect(within(section()).getByText("Dest-00")).toBeInTheDocument();
    expect(within(section()).queryByText("Dest-08")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Show all 11/i }));
    expect(within(section()).getByText("Dest-10")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Show less/i }));
    expect(within(section()).queryByText("Dest-08")).not.toBeInTheDocument();
  });

  it("searches across both tiers and picks a result", () => {
    const onPick = vi.fn();
    render(
      <DestinationPicker
        countries={[mk("Testland", 50)]}
        exploreCountries={explore}
        visitedNames={new Set()}
        onPick={onPick}
        onGoDiscover={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "explo" } });
    const btn = screen.getByRole("button", { name: "Explora" });
    fireEvent.click(btn);
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: "Explora" }));
  });
});
