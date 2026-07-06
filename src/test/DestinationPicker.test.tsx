import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import DestinationPicker from "../components/views/plan/DestinationPicker";
import { popularDestinations, byPopularity, comboRecommendations } from "../core/data/popularDestinations";
import { internationalSource } from "../core/trip/internationalSource";
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

describe("comboRecommendations", () => {
  it("returns plannable combo targets for a chosen country", () => {
    const recs = comboRecommendations(["Norway"]).map((c) => c.name);
    expect(recs).toContain("Iceland");
    expect(recs).toContain("Denmark");
  });

  it("excludes already-chosen countries and de-dupes across picks", () => {
    const recs = comboRecommendations(["Norway", "Iceland"]).map((c) => c.name);
    expect(recs).not.toContain("Norway");
    expect(recs).not.toContain("Iceland");
    expect(new Set(recs).size).toBe(recs.length);
  });

  it("honours an explicit exclude set and returns [] for unknown countries", () => {
    expect(comboRecommendations(["Norway"], new Set(["Iceland"])).map((c) => c.name)).not.toContain("Iceland");
    expect(comboRecommendations(["Nowhereland"])).toEqual([]);
  });
});

describe("DestinationPicker", () => {
  const explore = [mk("Explora", 80), mk("Wanderland", 70)];

  it("orders your list unvisited-first, each group by popularity", () => {
    const countries = [mk("Visited-High", 99), mk("Unvisited-Low", 5), mk("Unvisited-High", 90)];
    render(
      <DestinationPicker
        source={internationalSource}
        countries={countries}
        exploreCountries={explore}
        visitedNames={new Set(["Visited-High"])}
        onStart={vi.fn()}
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
        source={internationalSource}
        countries={countries}
        exploreCountries={explore}
        visitedNames={new Set(["Visited-High"])}
        favoriteNames={new Set(["Fav-Low", "Fav-High"])}
        onStart={vi.fn()}
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
        source={internationalSource}
        countries={many}
        exploreCountries={explore}
        visitedNames={new Set()}
        onStart={vi.fn()}
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

  it("searches across both tiers and starts a single-country trip on chip tap", () => {
    const onStart = vi.fn();
    render(
      <DestinationPicker
        source={internationalSource}
        countries={[mk("Testland", 50)]}
        exploreCountries={explore}
        visitedNames={new Set()}
        onStart={onStart}
        onGoDiscover={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "explo" } });
    const btn = screen.getByRole("button", { name: "Explora" });
    fireEvent.click(btn);
    expect(onStart).toHaveBeenCalledWith([expect.objectContaining({ name: "Explora" })]);
  });

  describe("multi-select", () => {
    const many = [mk("Aland", 90), mk("Bland", 80), mk("Cland", 70), mk("Dland", 60), mk("Eland", 50)];

    it("accumulates a selection and starts the trip in pick order via the Go arrow", () => {
      const onStart = vi.fn();
      render(
        <DestinationPicker
          source={internationalSource}
          countries={many}
          exploreCountries={explore}
          visitedNames={new Set()}
          onStart={onStart}
          onGoDiscover={vi.fn()}
          multiSelect
        />,
      );
      // A chip tap toggles selection instead of starting immediately.
      fireEvent.click(screen.getByRole("button", { name: "Cland" }));
      fireEvent.click(screen.getByRole("button", { name: "Aland" }));
      expect(onStart).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: /Plan trip/i }));
      expect(onStart).toHaveBeenCalledTimes(1);
      expect(onStart.mock.calls[0][0].map((c: { name: string }) => c.name)).toEqual(["Cland", "Aland"]);
    });

    it("moves a picked country from the grid into the token field, and back on removal", () => {
      const onStart = vi.fn();
      render(
        <DestinationPicker
          source={internationalSource}
          countries={many}
          exploreCountries={explore}
          visitedNames={new Set()}
          onStart={onStart}
          onGoDiscover={vi.fn()}
          multiSelect
        />,
      );
      // Picking a grid chip removes it from the grid (it now lives as a token).
      fireEvent.click(screen.getByRole("button", { name: "Aland" }));
      expect(screen.queryByRole("button", { name: "Aland" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Remove Aland" })).toBeInTheDocument();
      // Removing the token returns the country to the grid and clears the selection.
      fireEvent.click(screen.getByRole("button", { name: "Remove Aland" }));
      expect(screen.getByRole("button", { name: "Aland" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Plan trip/i })).not.toBeInTheDocument();
    });

    it("caps the selection and disables further chips", () => {
      render(
        <DestinationPicker
          source={internationalSource}
          countries={many}
          exploreCountries={[]}
          visitedNames={new Set()}
          onStart={vi.fn()}
          onGoDiscover={vi.fn()}
          multiSelect
          maxSelection={2}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Aland" }));
      fireEvent.click(screen.getByRole("button", { name: "Bland" }));
      expect(screen.getByText(/2\/2 selected/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cland" })).toBeDisabled();
    });

    it("removes a country from the search field via its chip, and via Backspace", () => {
      render(
        <DestinationPicker
          source={internationalSource}
          countries={many}
          exploreCountries={[]}
          visitedNames={new Set()}
          onStart={vi.fn()}
          onGoDiscover={vi.fn()}
          multiSelect
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Aland" }));
      fireEvent.click(screen.getByRole("button", { name: "Bland" }));
      // Chip remove button removes just that country.
      fireEvent.click(screen.getByRole("button", { name: "Remove Aland" }));
      expect(screen.getByText(/1\/4 selected/i)).toBeInTheDocument();
      // Backspace on the empty search field pops the last chip.
      fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Backspace" });
      expect(screen.queryByRole("button", { name: /Plan trip/i })).not.toBeInTheDocument();
    });

    it("surfaces 'pairs well with' combo suggestions after the first pick", () => {
      const onStart = vi.fn();
      render(
        <DestinationPicker
          source={internationalSource}
          countries={[mk("Norway", 40)]}
          exploreCountries={[]}
          visitedNames={new Set()}
          onStart={onStart}
          onGoDiscover={vi.fn()}
          multiSelect
        />,
      );
      // No suggestions until a country is chosen.
      expect(screen.queryByText(/Pairs well with/i)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Norway" }));
      const rec = screen.getByText(/Pairs well with Norway/i).closest("section")!;
      const add = within(rec).getByRole("button", { name: /Iceland/i });
      fireEvent.click(add);
      fireEvent.click(screen.getByRole("button", { name: /Plan trip/i }));
      expect(onStart.mock.calls[0][0].map((c: { name: string }) => c.name)).toEqual(["Norway", "Iceland"]);
    });
  });
});
