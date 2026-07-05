import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PillGroup from "../../components/shared/PillGroup";

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

    expect(screen.getByRole("radio", { name: "Asia" })).toHaveClass("bg-white", "text-blue-700");
    expect(screen.getByRole("radio", { name: "All" })).not.toHaveClass("bg-white", "text-blue-700");
  });

  it("uses the emerald accent when requested", () => {
    render(<PillGroup options={options} value="asia" onChange={vi.fn()} accent="emerald" />);

    const active = screen.getByRole("radio", { name: "Asia" });
    expect(active).toHaveClass("bg-white", "text-emerald-800", "focus-ring-emerald");
    expect(active).not.toHaveClass("text-blue-700");
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
});
