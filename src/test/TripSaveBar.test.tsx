import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TripSaveBar from "../components/views/plan/TripSaveBar";

describe("TripSaveBar", () => {
  it("confirms the trip is saved via a compact status with the details in a tooltip", () => {
    render(<TripSaveBar isMulti={false} favorite={false} onToggleFavorite={vi.fn()} />);
    expect(screen.getByText(/Saved/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Saved to My Trips — reopen this trip/i)).toBeInTheDocument();
  });

  it("uses route copy for a multi-stop trip", () => {
    render(<TripSaveBar isMulti favorite={false} onToggleFavorite={vi.fn()} />);
    expect(screen.getByTitle(/reopen this route/i)).toBeInTheDocument();
  });

  it("toggles the trip favorite", () => {
    const onToggleFavorite = vi.fn();
    render(<TripSaveBar isMulti={false} favorite={false} onToggleFavorite={onToggleFavorite} />);
    const btn = screen.getByRole("button", { name: /Favorite this trip/i });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(btn);
    expect(onToggleFavorite).toHaveBeenCalledTimes(1);
  });

  it("reflects a favorited trip", () => {
    render(<TripSaveBar isMulti={false} favorite onToggleFavorite={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /Remove this trip from favorites/i });
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(btn).toHaveTextContent("Favorited");
  });

  it("hides the favorite control when no handler is provided", () => {
    render(<TripSaveBar isMulti={false} favorite={false} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
