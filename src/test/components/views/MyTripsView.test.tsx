import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MyTripsView from "@/components/views/MyTripsView.tsx";
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
  };
}

describe("MyTripsView", () => {
  it("shows an empty state with a plan CTA when there are no saved trips", () => {
    const onGoPlan = vi.fn();
    render(<MyTripsView savedTrips={[]} onToggleFavorite={vi.fn()} onRemove={vi.fn()} onOpen={vi.fn()} onGoPlan={onGoPlan} />);
    expect(screen.getByText("No saved trips yet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Plan a trip" }));
    expect(onGoPlan).toHaveBeenCalled();
  });

  it("renders a saved trip with route name, cities and stats", () => {
    render(<MyTripsView savedTrips={[trip()]} onToggleFavorite={vi.fn()} onRemove={vi.fn()} onOpen={vi.fn()} onGoPlan={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Japan → Thailand" })).toBeInTheDocument();
    expect(screen.getByText("2-stop route")).toBeInTheDocument();
    expect(screen.getByText("Tokyo")).toBeInTheDocument();
    expect(screen.getByText("8 days")).toBeInTheDocument();
    expect(screen.getByText("3 places")).toBeInTheDocument();
  });

  it("toggles favorite through the callback", () => {
    const onToggleFavorite = vi.fn();
    render(<MyTripsView savedTrips={[trip()]} onToggleFavorite={onToggleFavorite} onRemove={vi.fn()} onOpen={vi.fn()} onGoPlan={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Favorite Japan → Thailand/i }));
    expect(onToggleFavorite).toHaveBeenCalledWith("t1");
  });

  it("confirms before removing a trip", async () => {
    const onRemove = vi.fn();
    render(<MyTripsView savedTrips={[trip()]} onToggleFavorite={vi.fn()} onRemove={onRemove} onOpen={vi.fn()} onGoPlan={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Delete Japan → Thailand/i }));
    const confirmBtn = await screen.findByRole("button", { name: "Delete" });
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(onRemove).toHaveBeenCalledWith("t1"));
  });

  it("opens a trip via the stretched card action", () => {
    const onOpen = vi.fn();
    render(<MyTripsView savedTrips={[trip()]} onToggleFavorite={vi.fn()} onRemove={vi.fn()} onOpen={onOpen} onGoPlan={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Open Japan → Thailand" }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: "t1" }));
  });

  it("groups favorites into their own section", () => {
    render(
      <MyTripsView
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
    render(<MyTripsView savedTrips={trips} onToggleFavorite={vi.fn()} onRemove={vi.fn()} onOpen={vi.fn()} onGoPlan={vi.fn()} />);
    const search = screen.getByRole("searchbox", { name: /search saved trips/i });

    fireEvent.change(search, { target: { value: "cusco" } });
    expect(screen.getByRole("heading", { name: "Peru" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Japan → Thailand" })).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "japan" } });
    expect(screen.getByRole("heading", { name: "Japan → Thailand" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Peru" })).not.toBeInTheDocument();
  });

  it("shows a no-results state that clears the search", () => {
    render(<MyTripsView savedTrips={[trip()]} onToggleFavorite={vi.fn()} onRemove={vi.fn()} onOpen={vi.fn()} onGoPlan={vi.fn()} />);
    const search = screen.getByRole("searchbox", { name: /search saved trips/i });
    fireEvent.change(search, { target: { value: "zzz" } });
    expect(screen.getByText(/No trips match/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("heading", { name: "Japan → Thailand" })).toBeInTheDocument();
  });
});
