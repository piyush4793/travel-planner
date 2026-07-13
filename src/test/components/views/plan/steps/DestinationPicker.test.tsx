import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import DestinationPicker from "@/components/views/plan/steps/DestinationPicker";
import { popularDestinations, byPopularity, comboRecommendations } from "@/core/data/popularDestinations.ts";
import { internationalSource } from "@/core/trip/internationalSource.ts";
import type { Country } from "@/core/types.ts";

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

  it("renders your recents in the given most-recent-first order", () => {
    // The store hands `countries` in MRU order; the picker preserves it verbatim
    // (no visited/favorite re-sorting anymore).
    const countries = [mk("Recent-1", 5), mk("Recent-2", 99), mk("Recent-3", 40)];
    render(
      <DestinationPicker
        source={internationalSource}
        countries={countries}
        exploreCountries={explore}
        onStart={vi.fn()}
      />,
    );
    const section = screen.getByText(/Jump back in/i).closest("section")!;
    const names = within(section).getAllByRole("button").map((b) => b.textContent?.replace(/[^\x00-\x7F]/g, "").trim());
    expect(names).toEqual(["Recent-1", "Recent-2", "Recent-3"]);
  });

  it("caps the list at 8, reveals all, then collapses back", () => {
    const many = Array.from({ length: 11 }, (_, i) => mk(`Dest-${String(i).padStart(2, "0")}`, 100 - i));
    render(
      <DestinationPicker
        source={internationalSource}
        countries={many}
        exploreCountries={explore}
        onStart={vi.fn()}
      />,
    );
    const section = () => screen.getByText(/Jump back in/i).closest("section")!;
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
        onStart={onStart}
      />,
    );
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "explo" } });
    const btn = screen.getByRole("button", { name: "Explora" });
    fireEvent.click(btn);
    expect(onStart).toHaveBeenCalledWith([expect.objectContaining({ name: "Explora" })]);
  });

  it("does not throw when matchMedia is unavailable (auto-focus guard)", () => {
    const original = window.matchMedia;
    // @ts-expect-error — simulate an environment without matchMedia.
    delete window.matchMedia;
    try {
      render(
        <DestinationPicker
          source={internationalSource}
          countries={[mk("Testland", 50)]}
          exploreCountries={[]}
          onStart={vi.fn()}
        />,
      );
      // The field renders but does not steal focus without a pointer signal.
      expect(screen.getByRole("searchbox")).not.toHaveFocus();
    } finally {
      window.matchMedia = original;
    }
  });

  it("ranks matches word-prefix > substring below a whole-name prefix", () => {
    render(
      <DestinationPicker
        source={internationalSource}
        countries={[mk("Makorland", 90), mk("South Korazone", 80), mk("Koraland", 70)]}
        exploreCountries={[]}
        onStart={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "kor" } });
    const section = screen.getByText(/Jump back in/i).closest("section")!;
    const names = within(section)
      .getAllByRole("button")
      .map((b) => b.textContent?.replace(/[^\x00-\x7F ]/g, "").trim());
    // Whole-name prefix first, then word-prefix, then bare substring — despite
    // popularity ordering the other way, relevance wins.
    expect(names).toEqual(["Koraland", "South Korazone", "Makorland"]);
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
          onStart={onStart}
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
          onStart={onStart}
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
          onStart={vi.fn()}
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
          onStart={vi.fn()}
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
          onStart={onStart}
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

  describe("month filter", () => {
    // Explore list in popularity order; month fit should re-rank without hiding.
    const seasonal = [
      mk("SummerLand", 90),
      mk("WinterLand", 80),
    ];
    seasonal[0].bestMonths = ["June", "July", "August"];
    seasonal[1].bestMonths = ["December", "January"];
    seasonal[1].worstMonths = ["July"];

    function renderPicker() {
      return render(
        <DestinationPicker
          source={internationalSource}
          countries={[]}
          exploreCountries={seasonal}
          onStart={vi.fn()}
        />,
      );
    }

    it("re-ranks the explore board by month fit and heads it 'Best in <month>'", () => {
      renderPicker();
      fireEvent.click(screen.getByRole("button", { name: /travel month/i }));
      fireEvent.click(screen.getByRole("button", { name: /^July$/i }));
      const section = screen.getByText(/Best in July/i).closest("section")!;
      const names = within(section).getAllByRole("button").map((b) => b.textContent?.replace(/[^\x00-\x7F]/g, "").trim());
      // Best-window destination sorts ahead of the avoid-window one (never hidden).
      expect(names).toEqual(["SummerLand", "WinterLand"]);
      expect(within(section).getByRole("img", { name: /great in July/i })).toBeInTheDocument();
      expect(within(section).getByRole("img", { name: /avoid July/i })).toBeInTheDocument();
    });

    it("shows a compact 3-letter month label on the pill (Any → Jul)", () => {
      renderPicker();
      const trigger = () => screen.getByRole("button", { name: /travel month|choose travel month/i });
      expect(trigger()).toHaveTextContent("Any");
      fireEvent.click(trigger());
      fireEvent.click(screen.getByRole("button", { name: /^July$/i }));
      // Compact abbreviation, never the full month name (keeps the pill width stable).
      expect(trigger()).toHaveTextContent("Jul");
      expect(trigger()).not.toHaveTextContent("July");
    });

    it("clears the month back to any-month order", () => {
      renderPicker();
      fireEvent.click(screen.getByRole("button", { name: /travel month/i }));
      fireEvent.click(screen.getByRole("button", { name: /^July$/i }));
      fireEvent.click(screen.getByRole("button", { name: /travel month/i }));
      fireEvent.click(screen.getByRole("button", { name: /Any month/i }));
      expect(screen.getByText(/Popular to explore/i)).toBeInTheDocument();
      expect(screen.queryByText(/Best in July/i)).not.toBeInTheDocument();
    });

    it("flags each selected token good/off-season when a month is chosen after selecting", () => {
      render(
        <DestinationPicker
          source={internationalSource}
          countries={[]}
          exploreCountries={seasonal}
          onStart={vi.fn()}
          multiSelect
        />,
      );
      // Select both destinations first, THEN pick the month (the reported flow).
      fireEvent.click(screen.getByRole("button", { name: /SummerLand/i }));
      fireEvent.click(screen.getByRole("button", { name: /WinterLand/i }));
      fireEvent.click(screen.getByRole("button", { name: /travel month/i }));
      fireEvent.click(screen.getByRole("button", { name: /^July$/i }));

      // Each token carries its own seasonality cue (scoped to the token, not the board).
      const summerToken = screen.getByRole("button", { name: "Remove SummerLand" }).closest("span")!;
      expect(within(summerToken).getByRole("img", { name: /great in July/i })).toBeInTheDocument();
      const winterToken = screen.getByRole("button", { name: "Remove WinterLand" }).closest("span")!;
      expect(within(winterToken).getByRole("img", { name: /avoid July/i })).toBeInTheDocument();
      // The off-season token is tinted with the accent (amber) color; the good one is not.
      expect(winterToken.className).toMatch(/accent/);
      expect(summerToken.className).not.toMatch(/accent/);
    });
  });

  describe("region browse", () => {
    it("filters the explore board to the chosen region and heads it 'Explore <region>'", () => {
      const asia = mk("Asiana", 90);
      const europe = mk("Europa", 80);
      asia.region = "Asia";
      europe.region = "Europe";
      render(
        <DestinationPicker
          source={internationalSource}
          countries={[]}
          exploreCountries={[asia, europe]}
          onStart={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: /^Asia$/ }));
      const section = screen.getByText(/Explore Asia/i).closest("section")!;
      const names = within(section).getAllByRole("button").map((b) => b.textContent?.replace(/[^\x00-\x7F]/g, "").trim());
      expect(names).toEqual(["Asiana"]);
      // Back to the popular (all-region) board restores both.
      fireEvent.click(screen.getByRole("button", { name: /^Popular$/ }));
      expect(screen.getByText("Europa")).toBeInTheDocument();
    });
  });

  describe("scope toggle", () => {
    it("is hidden unless showScopeToggle is set", () => {
      render(
        <DestinationPicker
          source={internationalSource}
          countries={[]}
          exploreCountries={explore}
          onStart={vi.fn()}
        />,
      );
      expect(screen.queryByRole("radiogroup", { name: /trip scope/i })).toBeNull();
    });

    it("renders the scope toggle and reports a scope change", () => {
      const onScopeChange = vi.fn();
      render(
        <DestinationPicker
          source={internationalSource}
          countries={[]}
          exploreCountries={explore}
          onStart={vi.fn()}
          showScopeToggle
          onScopeChange={onScopeChange}
          homeCountry="India"
        />,
      );
      const group = screen.getByRole("radiogroup", { name: /trip scope/i });
      const intl = within(group).getByRole("radio", { name: /international/i });
      const domestic = within(group).getByRole("radio", { name: /within india/i });
      expect(intl).toHaveAttribute("aria-checked", "true");
      expect(domestic).toHaveAttribute("aria-checked", "false");
      fireEvent.click(domestic);
      expect(onScopeChange).toHaveBeenCalledWith("domestic");
    });
  });
});
