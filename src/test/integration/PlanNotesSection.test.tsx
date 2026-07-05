import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import PlanNotesSection from "../../components/views/plan/PlanNotesSection";

describe("PlanNotesSection", () => {
  it("debounces edits and flushes on blur", () => {
    vi.useFakeTimers();
    const onSave = vi.fn();
    render(<PlanNotesSection notes="" onSave={onSave} />);
    const box = screen.getByRole("textbox");

    fireEvent.change(box, { target: { value: "Ski Lofoten" } });
    expect(onSave).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(400); });
    expect(onSave).toHaveBeenCalledWith("Ski Lofoten");

    fireEvent.change(box, { target: { value: "Ski Lofoten in March" } });
    fireEvent.blur(box);
    expect(onSave).toHaveBeenLastCalledWith("Ski Lofoten in March");
    vi.useRealTimers();
  });

  it("re-seeds the textarea when the destination's notes change", () => {
    const { rerender } = render(<PlanNotesSection notes="Norway note" onSave={vi.fn()} />);
    expect(screen.getByRole("textbox")).toHaveValue("Norway note");
    rerender(<PlanNotesSection notes="Japan note" onSave={vi.fn()} />);
    expect(screen.getByRole("textbox")).toHaveValue("Japan note");
  });
});
