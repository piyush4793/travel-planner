import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import PlanNotesSection from "@/components/views/plan/review/PlanNotesSection";

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

  it("opens and closes an expanded editor that shares the same value", () => {
    render(<PlanNotesSection notes="Shared note" onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Expand notes/i }));
    const dialog = screen.getByRole("dialog", { name: /Expanded notes/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getAllByRole("textbox").every((t) => (t as HTMLTextAreaElement).value === "Shared note")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /^Close$/i }));
    expect(screen.queryByRole("dialog", { name: /Expanded notes/i })).not.toBeInTheDocument();
  });
});
