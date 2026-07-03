import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Tooltip from "../../components/shared/Tooltip";

describe("Tooltip", () => {
  it("shows and hides tooltip content on hover", () => {
    render(<Tooltip text="Helpful text" />);

    const trigger = screen.getByText("i");

    Object.defineProperty(trigger, "getBoundingClientRect", {
      value: () => ({
        top: 140,
        left: 100,
        width: 20,
        height: 20,
        bottom: 160,
        right: 120,
        x: 100,
        y: 140,
        toJSON: () => ({}),
      }),
    });

    fireEvent.mouseEnter(trigger);
    expect(screen.getByText("Helpful text")).toBeInTheDocument();

    fireEvent.mouseLeave(trigger);
    expect(screen.queryByText("Helpful text")).not.toBeInTheDocument();
  });

  it("links the trigger to the tooltip via a unique aria-describedby id", () => {
    render(
      <>
        <Tooltip text="First tip" />
        <Tooltip text="Second tip" />
      </>,
    );

    const [firstTrigger, secondTrigger] = screen.getAllByText("i");
    expect(firstTrigger).not.toHaveAttribute("aria-describedby");

    fireEvent.focus(firstTrigger);
    const tip = screen.getByRole("tooltip");
    const describedBy = firstTrigger.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(tip).toHaveAttribute("id", describedBy);
    // The second, unopened tooltip must not share the id.
    expect(secondTrigger).not.toHaveAttribute("aria-describedby");
  });
});
