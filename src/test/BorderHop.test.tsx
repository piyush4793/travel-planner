import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BorderHop from "../components/views/plan/BorderHop";

describe("BorderHop", () => {
  it("renders a collapsed honest travel row by default", () => {
    render(<BorderHop fromName="Norway" toName="Denmark" />);
    expect(screen.getByText("Travel from Norway to Denmark")).toBeInTheDocument();
    expect(screen.queryByText("Flight")).not.toBeInTheDocument();
  });

  it("expands into a mode picker on click and is a11y-wired", () => {
    render(<BorderHop fromName="Norway" toName="Denmark" />);
    const trigger = screen.getByRole("button", { name: /Travel from Norway to Denmark/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Flight")).toBeInTheDocument();
    expect(screen.getByText("Rail")).toBeInTheDocument();
    expect(screen.getByText("Road")).toBeInTheDocument();
  });

  it("shows a distance-derived indicative flight estimate when coords are known", () => {
    render(
      <BorderHop
        fromName="Norway"
        toName="Denmark"
        fromPoint={{ lat: 60, lng: 10 }}
        toPoint={{ lat: 55, lng: 12 }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Travel from Norway to Denmark/ }));
    expect(screen.getByText(/~\d+h/)).toBeInTheDocument();
    expect(screen.getByText(/km apart/)).toBeInTheDocument();
  });

  it("never fakes a flight time when coords are missing", () => {
    render(<BorderHop fromName="Norway" toName="Denmark" />);
    fireEvent.click(screen.getByRole("button", { name: /Travel from Norway to Denmark/ }));
    expect(screen.getByText("check operators")).toBeInTheDocument();
    expect(screen.queryByText(/km apart/)).not.toBeInTheDocument();
  });
});
