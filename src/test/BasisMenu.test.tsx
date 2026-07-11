import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BasisMenu from "../components/views/plan/BasisMenu";

describe("BasisMenu", () => {
  it("shows the active basis and switches on selection", () => {
    const setBasis = vi.fn();
    render(<BasisMenu basis="couple" setBasis={setBasis} />);
    fireEvent.click(screen.getByRole("button", { name: /Who's going/i }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Family/i }));
    expect(setBasis).toHaveBeenCalledWith("family4");
  });

  it("marks the active option as checked", () => {
    render(<BasisMenu basis="solo" setBasis={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Who's going/i }));
    expect(screen.getByRole("menuitemradio", { name: /Solo/i })).toHaveAttribute("aria-checked", "true");
  });

  it("prefixes a labelled hint when requested", () => {
    render(<BasisMenu basis="couple" setBasis={vi.fn()} labelled />);
    expect(screen.getByText("Who's going")).toBeInTheDocument();
  });
});
