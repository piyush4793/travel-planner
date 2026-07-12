import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DayLengthControl from "@/components/views/plan/controls/DayLengthControl";

type Props = React.ComponentProps<typeof DayLengthControl>;

function renderControl(overrides: Partial<Props> = {}) {
  const onCommit = vi.fn();
  const onReset = vi.fn();
  const props: Props = {
    days: 5,
    maxDays: 12,
    recommendedDays: 5,
    daysPinned: false,
    handPickedCities: [],
    currentCities: ["Alpha", "Beta"],
    moreCitiesAvailable: false,
    projectCities: () => ["Alpha", "Beta"],
    onCommit,
    onReset,
    ...overrides,
  };
  render(<DayLengthControl {...props} />);
  return { onCommit, onReset, props };
}

const slider = () => screen.getByRole("slider", { name: /trip length in days/i });

/** Drag the slider to `value` and release (mouse-up commits). */
function dragTo(value: number) {
  const el = slider();
  fireEvent.change(el, { target: { value: String(value) } });
  fireEvent.mouseUp(el, { target: { value: String(value) } });
}

describe("DayLengthControl", () => {
  it("shows the auto-tuned hint when the length is not pinned", () => {
    renderControl({ daysPinned: false });
    expect(screen.getByText(/Auto-tuned to your choices/i)).toBeInTheDocument();
  });

  it("offers a reset to the recommended length only when pinned", () => {
    const { onReset } = renderControl({ daysPinned: true, recommendedDays: 6 });
    const reset = screen.getByRole("button", { name: /Reset \(6d\)/i });
    fireEvent.click(reset);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("commits a new length and reports the day delta", () => {
    const { onCommit } = renderControl({ days: 5, projectCities: () => ["Alpha", "Beta"] });
    dragTo(7);
    expect(onCommit).toHaveBeenCalledWith(7);
  });

  it("does not commit when released on the same value", () => {
    const { onCommit } = renderControl({ days: 5 });
    dragTo(5);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("warns inline when shortening drops an auto-selected city (no confirm needed)", async () => {
    const { onCommit } = renderControl({
      days: 5,
      currentCities: ["Alpha", "Beta"],
      handPickedCities: [],
      projectCities: () => ["Alpha"],
    });
    dragTo(3);
    await waitFor(() => expect(onCommit).toHaveBeenCalledWith(3));
    expect(screen.getByText(/Beta no longer fits/i)).toBeInTheDocument();
  });

  it("confirms before dropping a hand-picked city, and commits on accept", async () => {
    const { onCommit } = renderControl({
      days: 5,
      currentCities: ["Alpha", "Beta"],
      handPickedCities: ["Beta"],
      projectCities: () => ["Alpha"],
    });
    dragTo(2);
    const confirm = await screen.findByRole("button", { name: /Shorten anyway/i });
    fireEvent.click(confirm);
    await waitFor(() => expect(onCommit).toHaveBeenCalledWith(2));
  });

  it("reverts the slider and skips commit when a hand-picked drop is cancelled", async () => {
    const { onCommit } = renderControl({
      days: 5,
      currentCities: ["Alpha", "Beta"],
      handPickedCities: ["Beta"],
      projectCities: () => ["Alpha"],
    });
    dragTo(2);
    const cancel = await screen.findByRole("button", { name: /Keep as is/i });
    fireEvent.click(cancel);
    await waitFor(() => expect(onCommit).not.toHaveBeenCalled());
    expect(slider()).toHaveValue("5");
  });

  it("suggests adding a city when lengthening with room to spare", async () => {
    const { onCommit } = renderControl({
      days: 5,
      currentCities: ["Alpha", "Beta"],
      moreCitiesAvailable: true,
      projectCities: () => ["Alpha", "Beta"],
    });
    dragTo(8);
    await waitFor(() => expect(onCommit).toHaveBeenCalledWith(8));
    expect(screen.getByText(/room for another city/i)).toBeInTheDocument();
  });
});
