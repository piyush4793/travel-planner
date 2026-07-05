import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLifecyclePrompts, type LifecyclePromptsDeps } from "../hooks/useLifecyclePrompts";

function makeDeps(over: Partial<LifecyclePromptsDeps> = {}): LifecyclePromptsDeps {
  return {
    myListCount: 0,
    dataFingerprint: 0,
    lastBackupAt: "2024-01-01T00:00:00Z",
    isFavorite: () => false,
    onToggleFavorite: vi.fn(),
    onBackup: vi.fn(),
    onExplore: vi.fn(),
    ...over,
  };
}

describe("useLifecyclePrompts", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  it("shows nothing until a trigger fires", () => {
    const { result } = renderHook((p: LifecyclePromptsDeps) => useLifecyclePrompts(p), {
      initialProps: makeDeps(),
    });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.prompt).toBeNull();
    vi.useRealTimers();
  });

  it("surfaces the add-to-list nudge after first search, then remembers dismissal", () => {
    const { result } = renderHook((p: LifecyclePromptsDeps) => useLifecyclePrompts(p), {
      initialProps: makeDeps(),
    });
    act(() => { result.current.notifySearch(); });
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current.prompt?.kind).toBe("add-to-list");

    act(() => { result.current.dismiss(); });
    expect(result.current.prompt).toBeNull();
    expect(JSON.parse(localStorage.getItem("tp_lifecycle_dismissed") ?? "[]")).toContain("add-to-list");
    vi.useRealTimers();
  });

  it("does not nudge to add when the list already has destinations", () => {
    const { result } = renderHook((p: LifecyclePromptsDeps) => useLifecyclePrompts(p), {
      initialProps: makeDeps({ myListCount: 3 }),
    });
    act(() => { result.current.notifySearch(); });
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current.prompt).toBeNull();
    vi.useRealTimers();
  });

  it("surfaces the favorite nudge after a plan and toggles favorite on act", () => {
    const onToggleFavorite = vi.fn();
    const { result } = renderHook((p: LifecyclePromptsDeps) => useLifecyclePrompts(p), {
      initialProps: makeDeps({ onToggleFavorite }),
    });
    act(() => { result.current.notifyPlanCreated("Norway"); });
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current.prompt?.kind).toBe("favorite");
    expect(result.current.prompt?.message).toContain("Norway");

    act(() => { result.current.act(); });
    expect(onToggleFavorite).toHaveBeenCalledWith("Norway");
    expect(result.current.prompt).toBeNull();
    vi.useRealTimers();
  });

  it("skips the favorite nudge when the destination is already a favorite", () => {
    const { result } = renderHook((p: LifecyclePromptsDeps) => useLifecyclePrompts(p), {
      initialProps: makeDeps({ isFavorite: () => true }),
    });
    act(() => { result.current.notifyPlanCreated("Norway"); });
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current.prompt).toBeNull();
    vi.useRealTimers();
  });

  it("nudges to back up once changes cross the threshold, and snoozes on dismiss", () => {
    const onBackup = vi.fn();
    const { result, rerender } = renderHook((p: LifecyclePromptsDeps) => useLifecyclePrompts(p), {
      initialProps: makeDeps({ dataFingerprint: 0, onBackup, backupThreshold: 3 }),
    });
    // Baseline is captured at fingerprint 0; grow it past the threshold.
    rerender(makeDeps({ dataFingerprint: 4, onBackup, backupThreshold: 3 }));
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current.prompt?.kind).toBe("backup");

    act(() => { result.current.dismiss(); });
    expect(result.current.prompt).toBeNull();

    // Snoozed: the same volume of data no longer nudges.
    rerender(makeDeps({ dataFingerprint: 4, onBackup, backupThreshold: 3 }));
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current.prompt).toBeNull();
    vi.useRealTimers();
  });

  it("resets the backup baseline when a backup happens (lastBackupAt changes)", () => {
    const { result, rerender } = renderHook((p: LifecyclePromptsDeps) => useLifecyclePrompts(p), {
      initialProps: makeDeps({ dataFingerprint: 0, backupThreshold: 3 }),
    });
    rerender(makeDeps({ dataFingerprint: 5, backupThreshold: 3 }));
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current.prompt?.kind).toBe("backup");

    // A backup lands: new timestamp re-baselines at the current volume.
    rerender(makeDeps({ dataFingerprint: 5, lastBackupAt: "2024-06-01T00:00:00Z", backupThreshold: 3 }));
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current.prompt).toBeNull();
    vi.useRealTimers();
  });

  it("prioritizes the favorite nudge over a pending backup nudge", () => {
    const { result, rerender } = renderHook((p: LifecyclePromptsDeps) => useLifecyclePrompts(p), {
      initialProps: makeDeps({ dataFingerprint: 0, backupThreshold: 3 }),
    });
    rerender(makeDeps({ dataFingerprint: 5, backupThreshold: 3 }));
    act(() => { result.current.notifyPlanCreated("Japan"); });
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current.prompt?.kind).toBe("favorite");
    vi.useRealTimers();
  });
});
