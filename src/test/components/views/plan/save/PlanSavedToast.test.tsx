import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PlanSavedToast from "@/components/views/plan/save/PlanSavedToast";

describe("PlanSavedToast", () => {
  it("renders nothing when closed", () => {
    render(<PlanSavedToast open={false} message="Trip saved to My Trips" onClose={vi.fn()} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows a transient saved confirmation when open", () => {
    render(<PlanSavedToast open message="Route saved to My Trips" onClose={vi.fn()} />);
    const toast = screen.getByRole("status");
    expect(toast).toHaveTextContent(/Route saved to My Trips/i);
  });

  it("fires onClose from the dismiss button", () => {
    const onClose = vi.fn();
    render(<PlanSavedToast open message="Trip saved to My Trips" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
