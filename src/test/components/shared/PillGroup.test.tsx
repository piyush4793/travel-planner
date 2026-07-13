import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PillGroup from "@/components/shared/PillGroup.tsx";

vi.mock("maplibre-gl", () => ({
  default: { Map: vi.fn(), Marker: vi.fn() },
  Map: vi.fn(),
  Marker: vi.fn(),
}));

describe("PillGroup", () => {
  const options = [
    { key: "all", label: "All" },
    { key: "asia", label: "Asia" },
    { key: "europe", label: "Europe" },
  ];

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders all options as tabs", () => {
    render(<PillGroup options={options} value="all" onChange={vi.fn()} />);

    expect(screen.getByRole("radio", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Asia" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Europe" })).toBeInTheDocument();
  });

  it("applies active styling to the selected pill", () => {
    render(<PillGroup options={options} value="asia" onChange={vi.fn()} />);

    const active = screen.getByRole("radio", { name: "Asia" });
    expect(active).toHaveClass("bg-brand-700", "text-white", "focus-ring-emerald");
    expect(screen.getByRole("radio", { name: "All" })).not.toHaveClass("bg-brand-700", "text-white");
  });

  it("calls onChange with the clicked key", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<PillGroup options={options} value="all" onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: "Europe" }));

    expect(onChange).toHaveBeenCalledWith("europe");
  });

  it("calls onChange even when clicking the already active pill", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<PillGroup options={options} value="asia" onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: "Asia" }));

    expect(onChange).toHaveBeenCalledWith("asia");
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("moves selection with Arrow keys (wrapping) and ignores non-arrow keys", async () => {
    const { fireEvent } = await import("@testing-library/react");
    const onChange = vi.fn();
    render(<PillGroup options={options} value="all" onChange={onChange} />);
    const first = screen.getByRole("radio", { name: "All" });

    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("asia");

    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(onChange).toHaveBeenLastCalledWith("asia");

    // Wrap backwards from the first option to the last.
    fireEvent.keyDown(first, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("europe");

    fireEvent.keyDown(first, { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith("europe");

    onChange.mockClear();
    fireEvent.keyDown(first, { key: "Home" });
    expect(onChange).not.toHaveBeenCalled();
  });
});
