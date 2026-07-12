import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { setupUser } from "@/test/testUtils.ts";
import PlanCompareModal from "@/components/country/PlanCompareModal.tsx";
import type { TripPlan } from "@/core/utils/tripPlans.ts";

function makePlan(overrides: Partial<TripPlan> = {}): TripPlan {
  return {
    duration: "5 days",
    costPerPerson: "₹1L",
    note: "",
    days: [
      { label: "Day 1 — Tokyo", activities: ["Shibuya", "Sushi"], hotels: ["Park Hotel"] },
      { label: "Day 2 — Kyoto", activities: ["Fushimi Inari"] },
    ],
    ...overrides,
  };
}

const options = (extra: TripPlan[] = []) => [
  { id: "default", label: "Default", plan: makePlan() },
  {
    id: "ai",
    label: "AI Plan",
    plan: makePlan({
      costPerPerson: "₹2L",
      days: [
        { label: "Day 1 — Tokyo", activities: ["Ueda", "Ramen", "Akihabara"] },
        { label: "Day 2 — Osaka", activities: ["Dotonbori"] },
        { label: "Day 3 — Osaka", activities: ["Castle"] },
      ],
    }),
  },
  ...extra.map((p, i) => ({ id: `x${i}`, label: `Extra ${i}`, plan: p })),
];

describe("PlanCompareModal", () => {
  it("returns null when fewer than two plans are provided", () => {
    const { container } = render(
      <PlanCompareModal options={[options()[0]]} onClose={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders side-by-side summary with duration and city counts", () => {
    render(<PlanCompareModal options={options()} onClose={vi.fn()} />);

    expect(screen.getByText(/Side-by-Side Comparison/i)).toBeInTheDocument();
    expect(screen.getByText("Duration")).toBeInTheDocument();
    expect(screen.getByText("Cities")).toBeInTheDocument();
    // Default = Tokyo+Kyoto (2 cities), AI = Tokyo+Osaka (2 cities).
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
  });

  it("computes shared and unique cities between the two plans", () => {
    render(<PlanCompareModal options={options()} onClose={vi.fn()} />);

    // Tokyo appears in both plans → Shared.
    expect(screen.getByText("Shared")).toBeInTheDocument();
    expect(screen.getByText("Tokyo")).toBeInTheDocument();
    // Kyoto only in left, Osaka only in right.
    expect(screen.getByText("Kyoto")).toBeInTheDocument();
    expect(screen.getByText("Osaka")).toBeInTheDocument();
  });

  it("switching the right selector updates the compared plan", async () => {
    const user = setupUser();
    render(<PlanCompareModal options={options()} onClose={vi.fn()} />);

    // Two <select> comboboxes: [0]=Left, [1]=Right (labels aren't htmlFor-associated).
    const rightSelect = screen.getAllByRole("combobox")[1];
    await user.selectOptions(rightSelect, "default");
    // Now comparing Default vs Default → both columns identical, Kyoto shown in each.
    expect(screen.getAllByText(/Kyoto/).length).toBeGreaterThanOrEqual(2);
  });

  it("collapses and expands the quick summary", async () => {
    const user = setupUser();
    render(<PlanCompareModal options={options()} onClose={vi.fn()} />);

    const toggle = screen.getByRole("button", { name: /Quick Summary/i });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("invokes onClose from the header close button", async () => {
    const user = setupUser();
    const onClose = vi.fn();
    render(<PlanCompareModal options={options()} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /Close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders an empty-state message for a plan with no days", async () => {
    const user = setupUser();
    render(
      <PlanCompareModal
        options={[
          options()[0],
          { id: "empty", label: "Empty", plan: makePlan({ days: [] }) },
        ]}
        onClose={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getAllByRole("combobox")[1], "empty");
    expect(screen.getByText(/No days in this plan/i)).toBeInTheDocument();
  });
});
