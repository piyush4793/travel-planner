import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MyTripsView from "@/components/views/MyTripsView.tsx";
import { getCountryFlag } from "@/utils/countryFlags.ts";
import type { SavedTrip } from "@/core/utils/savedTrips.ts";

function trip(over: Partial<SavedTrip> = {}): SavedTrip {
  return {
    id: over.id ?? "t1",
    name: over.name ?? "Japan → Thailand",
    stops: over.stops ?? [
      { country: "Japan", days: 5, cities: ["Tokyo", "Kyoto"] },
      { country: "Thailand", days: 3, cities: ["Bangkok"] },
    ],
    basis: over.basis ?? "couple",
    totalDays: over.totalDays ?? 8,
    costPerPerson: over.costPerPerson ?? "₹1.2L – ₹1.8L",
    savedAt: over.savedAt ?? new Date().toISOString(),
    favorite: over.favorite,
    scope: over.scope,
  };
}

describe("MyTripsView", () => {
  it("shows an empty state with a plan CTA when there are no saved trips", () => {
    const onGoPlan = vi.fn();
    render(<MyTripsView savedTrips={[]} homeCountry="India" onToggleFavorite={vi.fn()} onRemove={vi.fn()} onOpen={vi.fn()} onGoPlan={onGoPlan} />);
    expect(screen.getByText("No saved trips yet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Plan a trip" }));
    expect(onGoPlan).toHaveBeenCalled();
  });

  it("renders a saved trip with route name, cities and stats", () => {
    render(<MyTripsView savedTrips={[trip()]} homeCountry="India" onToggleFavorite={vi.fn()} onRemove={vi.fn()} onOpen={vi.fn()} onGoPlan={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Japan → Thailand" })).toBeInTheDocument();
    expect(screen.getByText("2-stop route")).toBeInTheDocument();
    expect(screen.getByText("Tokyo")).toBeInTheDocument();
    expect(screen.getByText("8 days")).toBeInTheDocument();
    expect(screen.getByText("3 places")).toBeInTheDocument();
  });

  it("guards against horizontal scroll: clips the page and lets long tokens wrap", () => {
    const { container } = render(
      <MyTripsView
        homeCountry="India"
        savedTrips={[trip({ name: "Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch", stops: [{ country: "Wales", days: 8, cities: ["Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch"] }] })]}
        onToggleFavorite={vi.fn()}
        onRemove={vi.fn()}
        onOpen={vi.fn()}
        onGoPlan={vi.fn()}
      />,
    );
    // Outer scroll container must never scroll horizontally.
    expect(container.querySelector(".overflow-x-hidden")).not.toBeNull();
    // The card and its long-token chip must be allowed to shrink/wrap so a
    // no-space name can't force the card wider than its column.
    expect(container.querySelector("article.min-w-0")).not.toBeNull();
    expect(container.querySelector("article .break-words")).not.toBeNull();
  });

  it("badges an international trip and a domestic (India) trip distinctly", () => {
    render(
      <MyTripsView
        homeCountry="India"
        savedTrips={[
          trip({ id: "intl" }),
          trip({
            id: "dom",
            name: "Rajasthan → Kerala",
            scope: "domestic",
            stops: [
              { country: "Rajasthan", days: 6, cities: ["Jaipur"] },
              { country: "Kerala", days: 4, cities: ["Kochi"] },
            ],
          }),
        ]}
        onToggleFavorite={vi.fn()}
        onRemove={vi.fn()}
        onOpen={vi.fn()}
        onGoPlan={vi.fn()}
      />,
    );
    expect(screen.getByText(/🌍 International/)).toBeInTheDocument();
    expect(screen.getByText(/🏠 India/)).toBeInTheDocument();
  });

  it("renders the home flag only once for a multi-stop domestic trip", () => {
    const { container } = render(
      <MyTripsView
        homeCountry="India"
        savedTrips={[
          trip({
            id: "dom",
            name: "Rajasthan → Uttar Pradesh → Delhi",
            scope: "domestic",
            stops: [
              { country: "Rajasthan", days: 3, cities: ["Jaipur"] },
              { country: "Uttar Pradesh", days: 3, cities: ["Agra"] },
              { country: "Delhi", days: 2, cities: ["New Delhi"] },
            ],
          }),
        ]}
        onToggleFavorite={vi.fn()}
        onRemove={vi.fn()}
        onOpen={vi.fn()}
        onGoPlan={vi.fn()}
      />,
    );
    const indiaFlag = getCountryFlag("India");
    const occurrences = (container.textContent ?? "").split(indiaFlag).length - 1;
    // Exactly one in the flag row; the "🏠 India" badge uses a house emoji, not the flag.
    expect(occurrences).toBe(1);
  });

  it("renders a distinct flag per country for an international route", () => {
    const { container } = render(
      <MyTripsView
        homeCountry="India"
        savedTrips={[trip()]}
        onToggleFavorite={vi.fn()}
        onRemove={vi.fn()}
        onOpen={vi.fn()}
        onGoPlan={vi.fn()}
      />,
    );
    const text = container.textContent ?? "";
    expect(text.includes(getCountryFlag("Japan"))).toBe(true);
    expect(text.includes(getCountryFlag("Thailand"))).toBe(true);
  });

  it("toggles favorite through the callback", () => {
    const onToggleFavorite = vi.fn();
    render(<MyTripsView savedTrips={[trip()]} homeCountry="India" onToggleFavorite={onToggleFavorite} onRemove={vi.fn()} onOpen={vi.fn()} onGoPlan={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Favorite Japan → Thailand/i }));
    expect(onToggleFavorite).toHaveBeenCalledWith("t1");
  });

  it("confirms before removing a trip", async () => {
    const onRemove = vi.fn();
    render(<MyTripsView savedTrips={[trip()]} homeCountry="India" onToggleFavorite={vi.fn()} onRemove={onRemove} onOpen={vi.fn()} onGoPlan={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Delete Japan → Thailand/i }));
    const confirmBtn = await screen.findByRole("button", { name: "Delete" });
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(onRemove).toHaveBeenCalledWith("t1"));
  });

  it("opens a trip via the stretched card action", () => {
    const onOpen = vi.fn();
    render(<MyTripsView savedTrips={[trip()]} homeCountry="India" onToggleFavorite={vi.fn()} onRemove={vi.fn()} onOpen={onOpen} onGoPlan={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Open Japan → Thailand" }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: "t1" }));
  });

  it("groups favorites into their own section", () => {
    render(
      <MyTripsView
        homeCountry="India"
        savedTrips={[trip({ id: "a", name: "Norway", favorite: true, stops: [{ country: "Norway", days: 4, cities: [] }] }), trip({ id: "b", name: "Peru", stops: [{ country: "Peru", days: 6, cities: [] }] })]}
        onToggleFavorite={vi.fn()}
        onRemove={vi.fn()}
        onOpen={vi.fn()} onGoPlan={vi.fn()}
      />,
    );
    expect(screen.getByText("★ Favorites")).toBeInTheDocument();
    expect(screen.getByText("All trips")).toBeInTheDocument();
    expect(screen.getByText("2 saved trips")).toBeInTheDocument();
  });

  it("filters trips by the search box (name, country, or city)", () => {
    const trips = [
      trip({ id: "a", name: "Japan → Thailand" }),
      trip({ id: "b", name: "Peru", stops: [{ country: "Peru", days: 6, cities: ["Cusco"] }] }),
    ];
    render(<MyTripsView savedTrips={trips} homeCountry="India" onToggleFavorite={vi.fn()} onRemove={vi.fn()} onOpen={vi.fn()} onGoPlan={vi.fn()} />);
    const search = screen.getByRole("searchbox", { name: /search saved trips/i });

    fireEvent.change(search, { target: { value: "cusco" } });
    expect(screen.getByRole("heading", { name: "Peru" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Japan → Thailand" })).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "japan" } });
    expect(screen.getByRole("heading", { name: "Japan → Thailand" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Peru" })).not.toBeInTheDocument();
  });

  it("hides the scope filter for a single-scope library and shows it when mixed", () => {
    const { rerender } = render(
      <MyTripsView savedTrips={[trip()]} homeCountry="India" onToggleFavorite={vi.fn()} onRemove={vi.fn()} onOpen={vi.fn()} onGoPlan={vi.fn()} />,
    );
    expect(screen.queryByRole("button", { name: "All trips" })).not.toBeInTheDocument();

    rerender(
      <MyTripsView
        homeCountry="India"
        savedTrips={[
          trip({ id: "intl" }),
          trip({ id: "dom", name: "Rajasthan", scope: "domestic", stops: [{ country: "Rajasthan", days: 6, cities: ["Jaipur"] }] }),
        ]}
        onToggleFavorite={vi.fn()} onRemove={vi.fn()} onOpen={vi.fn()} onGoPlan={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "All trips" })).toBeInTheDocument();
  });

  it("filters the gallery to a single scope via the dropdown", () => {
    render(
      <MyTripsView
        homeCountry="India"
        savedTrips={[
          trip({ id: "intl", name: "Japan → Thailand" }),
          trip({ id: "dom", name: "Rajasthan", scope: "domestic", stops: [{ country: "Rajasthan", days: 6, cities: ["Jaipur"] }] }),
        ]}
        onToggleFavorite={vi.fn()} onRemove={vi.fn()} onOpen={vi.fn()} onGoPlan={vi.fn()}
      />,
    );
    // Both visible by default.
    expect(screen.getByRole("heading", { name: "Japan → Thailand" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Rajasthan" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "All trips" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /🏠 India/ }));
    expect(screen.getByRole("heading", { name: "Rajasthan" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Japan → Thailand" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /🏠 India/ }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /🌍 International/ }));
    expect(screen.getByRole("heading", { name: "Japan → Thailand" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Rajasthan" })).not.toBeInTheDocument();
  });
});
