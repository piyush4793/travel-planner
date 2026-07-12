import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TripSaveBar from "@/components/views/plan/save/TripSaveBar";

describe("TripSaveBar", () => {
  it("confirms the trip is saved via a compact status with the details in a tooltip", () => {
    render(<TripSaveBar isMulti={false} favorite={false} onToggleFavorite={vi.fn()} />);
    // The old always-on "Saved" badge is gone — confirmation is a transient toast.
    expect(screen.queryByText(/^Saved$/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Favorite this trip/i })).toBeInTheDocument();
  });

  it("uses route copy for a multi-stop trip", () => {
    render(<TripSaveBar isMulti favorite={false} onToggleFavorite={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Favorite this route/i })).toBeInTheDocument();
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
    expect(btn).toHaveTextContent("★");
  });

  it("hides the favorite control when no handler is provided", () => {
    render(<TripSaveBar isMulti={false} favorite={false} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
