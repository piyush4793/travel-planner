import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CinematicControls from "@/components/country/cinematic/CinematicControls.tsx";

const baseProps = {
  ctrlBtnSize: "w-9 h-9",
  canGoPrev: true,
  paused: false,
  speed: 1,
  onPrev: vi.fn(),
  onTogglePause: vi.fn(),
  onSkip: vi.fn(),
  onCycleSpeed: vi.fn(),
  onClose: vi.fn(),
};

afterEach(cleanup);

describe("CinematicControls", () => {
  it("wires each control to its handler", async () => {
    const props = { ...baseProps, onPrev: vi.fn(), onTogglePause: vi.fn(), onSkip: vi.fn(), onCycleSpeed: vi.fn(), onClose: vi.fn() };
    render(<CinematicControls {...props} />);

    await userEvent.click(screen.getByLabelText("Back to previous stop"));
    await userEvent.click(screen.getByLabelText("Pause"));
    await userEvent.click(screen.getByLabelText("Skip to next stop"));
    await userEvent.click(screen.getByLabelText("Playback speed 1×"));
    await userEvent.click(screen.getByLabelText("Close"));

    expect(props.onPrev).toHaveBeenCalledTimes(1);
    expect(props.onTogglePause).toHaveBeenCalledTimes(1);
    expect(props.onSkip).toHaveBeenCalledTimes(1);
    expect(props.onCycleSpeed).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("disables the prev button when there is no earlier stop", () => {
    render(<CinematicControls {...baseProps} canGoPrev={false} />);
    expect(screen.getByLabelText("Back to previous stop")).toBeDisabled();
  });

  it("reflects paused state as a Resume affordance and shows the current speed", () => {
    render(<CinematicControls {...baseProps} paused speed={1.5} />);
    expect(screen.getByLabelText("Resume")).toBeInTheDocument();
    expect(screen.getByLabelText("Playback speed 1.5×")).toHaveTextContent("1.5×");
  });
});
