import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CityPicker from "../components/views/plan/CityPicker";
import type { CityEntry } from "../core/types";

const cities = [
  { name: "Oslo" } as CityEntry,
  { name: "Bergen" } as CityEntry,
];

describe("CityPicker", () => {
  it("labels the auto-picked count when nothing is hand-picked", () => {
    render(
      <CityPicker
        cities={cities}
        selectedCities={[]}
        autoSelectedCities={["Oslo"]}
        activeExperiences={[]}
        onToggle={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByText("Auto-picked 1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reset to auto" })).not.toBeInTheDocument();
  });

  it("labels the hand-picked count and offers a reset", () => {
    const onClear = vi.fn();
    render(
      <CityPicker
        cities={cities}
        selectedCities={["Bergen"]}
        autoSelectedCities={["Oslo"]}
        activeExperiences={[]}
        onToggle={vi.fn()}
        onClear={onClear}
      />,
    );
    expect(screen.getByText("1 hand-picked")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset to auto" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("fires onToggle for the tapped city", () => {
    const onToggle = vi.fn();
    render(
      <CityPicker
        cities={cities}
        selectedCities={[]}
        autoSelectedCities={["Oslo"]}
        activeExperiences={[]}
        onToggle={onToggle}
        onClear={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Bergen/ }));
    expect(onToggle).toHaveBeenCalledWith("Bergen");
  });
});
