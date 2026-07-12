import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AiItineraryModal from "@/components/ai/AiItineraryModal.tsx";
import type { LLMTripPlanResult } from "@/core/utils/ai/llmTransform.ts";
import type { SavedAiPlan } from "@/hooks/useAiPlanStore.ts";

function makeResult(overrides: Partial<LLMTripPlanResult> = {}): LLMTripPlanResult {
  const base: LLMTripPlanResult = {
    destinationName: "Norway",
    originCountry: "India",
    travelers: 2,
    durationDays: 3,
    budgetLevel: "mid-range",
    assumptions: ["Assumes autumn travel"],
    cities: [
      { name: "Oslo", lat: 59.9, lng: 10.7, nights: 1, transportToNext: { type: "train", label: "Oslo → Bergen", cost: "₹5K" } },
      { name: "Bergen", lat: 60.4, lng: 5.3, nights: 2 },
    ],
    meta: {
      bestMonths: ["June"],
      worstMonths: ["January"],
      thingsToAvoid: ["Pickpockets"],
      visaTips: "Schengen 90 days",
      comboCountries: ["Sweden"],
      highlights: ["Fjords"],
    },
    plan: {
      duration: "3 days",
      costPerPerson: "₹1L",
      note: "",
      days: [
        { label: "Day 1 — Oslo", activities: ["Opera House", "Vigeland Park"], hotels: ["Oslo Hotel"] },
        { label: "Day 2 — Bergen", activities: ["Fjord cruise"] },
        { label: "Day 3 — Bergen", activities: ["Funicular"] },
      ],
    },
  };

  return {
    ...base,
    ...overrides,
    assumptions: overrides.assumptions ?? base.assumptions,
    cities: overrides.cities ?? base.cities,
    meta: { ...base.meta, ...overrides.meta },
    plan: { ...base.plan, ...overrides.plan },
  };
}

function makeSavedPlan(overrides: Partial<SavedAiPlan> = {}): SavedAiPlan {
  const result = makeResult();
  return {
    id: "plan-1",
    schemaVersion: 1,
    savedAt: "2026-01-02T00:00:00.000Z",
    destinationKey: "norway",
    destinationName: "Norway",
    result,
    ...overrides,
  };
}

describe("AiItineraryModal", () => {
  it("renders destination, trip summary, origin, travelers, and budget level", () => {
    render(<AiItineraryModal result={makeResult()} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: /AI Itinerary — Norway/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Norway" })).toBeInTheDocument();
    expect(screen.getByText("3 days")).toBeInTheDocument();
    expect(screen.getByText("₹1L")).toBeInTheDocument();
    expect(screen.getByText("From: India")).toBeInTheDocument();
    expect(screen.getByText("2 travelers")).toBeInTheDocument();
    expect(screen.getByText("mid-range")).toBeInTheDocument();
  });

  it("renders the multi-city route summary and transport details", () => {
    render(<AiItineraryModal result={makeResult()} onClose={vi.fn()} />);

    expect(screen.getAllByText("Oslo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bergen").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Oslo → Bergen").length).toBeGreaterThan(0);
    expect(screen.getByText("₹5K")).toBeInTheDocument();
  });

  it("renders every day label with activities and hotels", () => {
    render(<AiItineraryModal result={makeResult()} onClose={vi.fn()} />);

    expect(screen.getByText("Day 1 — Oslo")).toBeInTheDocument();
    expect(screen.getByText("Opera House")).toBeInTheDocument();
    expect(screen.getByText("Vigeland Park")).toBeInTheDocument();
    expect(screen.getByText(/Oslo Hotel/)).toBeInTheDocument();
    expect(screen.getByText("Day 2 — Bergen")).toBeInTheDocument();
    expect(screen.getByText("Fjord cruise")).toBeInTheDocument();
    expect(screen.getByText("Day 3 — Bergen")).toBeInTheDocument();
    expect(screen.getByText("Funicular")).toBeInTheDocument();
  });

  it("copies the day route link and unmounts cleanly without a pending-timer crash", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const { unmount } = render(<AiItineraryModal result={makeResult()} onClose={vi.fn()} />);

    const copyBtn = screen.getAllByRole("button", { name: /Copy route link/i })[0];
    expect(copyBtn.className).toContain("min-h-[32px]");

    fireEvent.click(copyBtn);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("button", { name: /Route link copied/i })).toBeInTheDocument();

    // Unmount before the 1.5s reset — cleanup clears the timer (no setState-after-unmount).
    expect(() => unmount()).not.toThrow();
  });

  it("calls onClose from the close button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AiItineraryModal result={makeResult()} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows saved state after saving the destination to My List", async () => {
    const user = userEvent.setup();
    const onSaveToList = vi.fn<(destinationName: string) => "saved" | "exists">().mockReturnValue("saved");
    render(<AiItineraryModal result={makeResult()} onClose={vi.fn()} onSaveToList={onSaveToList} />);

    await user.click(screen.getByRole("button", { name: /Save to My List/i }));

    expect(onSaveToList).toHaveBeenCalledWith("Norway");
    expect(screen.getByText(/In My List/i)).toBeInTheDocument();
  });

  it("shows already-exists state when the destination is already in My List", async () => {
    const user = userEvent.setup();
    const onSaveToList = vi.fn<(destinationName: string) => "saved" | "exists">().mockReturnValue("exists");
    render(<AiItineraryModal result={makeResult()} onClose={vi.fn()} onSaveToList={onSaveToList} />);

    await user.click(screen.getByRole("button", { name: /Save to My List/i }));

    expect(onSaveToList).toHaveBeenCalledWith("Norway");
    expect(screen.getByText(/Already in My List/i)).toBeInTheDocument();
  });

  it("saves a plan directly when no existing plans need comparison", async () => {
    const user = userEvent.setup();
    const onSavePlan = vi.fn();
    render(<AiItineraryModal result={makeResult()} onClose={vi.fn()} canAddNew onSavePlan={onSavePlan} />);

    await user.click(screen.getByRole("button", { name: /Save Plan/i }));

    expect(onSavePlan).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Plan saved/i)).toBeInTheDocument();
  });

  it("shows comparison and add-new action when existing plans are present", async () => {
    const user = userEvent.setup();
    const onSavePlan = vi.fn();
    render(
      <AiItineraryModal
        result={makeResult()}
        onClose={vi.fn()}
        existingPlans={[makeSavedPlan()]}
        canAddNew
        maxPlans={3}
        onSavePlan={onSavePlan}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Save Plan/i }));

    expect(screen.getByText(/1 existing plan for Norway/i)).toBeInTheDocument();
    expect(screen.getByText("New Plan")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Add as New/i }));
    expect(onSavePlan).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Plan saved/i)).toBeInTheDocument();
  });

  it("shows replace UI when max plans are reached and replaces an existing plan", async () => {
    const user = userEvent.setup();
    const onReplacePlan = vi.fn();
    render(
      <AiItineraryModal
        result={makeResult()}
        onClose={vi.fn()}
        existingPlans={[makeSavedPlan({ id: "existing-plan" })]}
        canAddNew={false}
        maxPlans={1}
        onSavePlan={vi.fn()}
        onReplacePlan={onReplacePlan}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Save Plan/i }));

    expect(screen.getByText(/Max 1 plans reached/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Replace/i }));
    // Replace is now guarded by a confirm dialog
    expect(onReplacePlan).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /Replace/i }));
    expect(onReplacePlan).toHaveBeenCalledWith("existing-plan");
    expect(screen.getByText(/Plan saved/i)).toBeInTheDocument();
  });

  it("does not replace when the confirm dialog is cancelled", async () => {
    const user = userEvent.setup();
    const onReplacePlan = vi.fn();
    render(
      <AiItineraryModal
        result={makeResult()}
        onClose={vi.fn()}
        existingPlans={[makeSavedPlan({ id: "existing-plan" })]}
        canAddNew={false}
        maxPlans={1}
        onSavePlan={vi.fn()}
        onReplacePlan={onReplacePlan}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Save Plan/i }));
    await user.click(screen.getByRole("button", { name: /Replace/i }));
    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /Cancel/i }));
    expect(onReplacePlan).not.toHaveBeenCalled();
  });
});
