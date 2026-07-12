import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLifecyclePrompts, type LifecyclePromptsDeps } from "@/hooks/useLifecyclePrompts.ts";

function makeDeps(over: Partial<LifecyclePromptsDeps> = {}): LifecyclePromptsDeps {
  return {
    dataFingerprint: 0,
    lastBackupAt: "2024-01-01T00:00:00Z",
    onBackup: vi.fn(),
    ...over,
  };
}

describe("useLifecyclePrompts", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  it("shows nothing until changes accumulate", () => {
    const { result } = renderHook((p: LifecyclePromptsDeps) => useLifecyclePrompts(p), {
      initialProps: makeDeps({ backupThreshold: 3 }),
    });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.prompt).toBeNull();
    vi.useRealTimers();
  });

  it("nudges to back up once changes cross the threshold, and runs backup on act", () => {
    const onBackup = vi.fn();
    const { result, rerender } = renderHook((p: LifecyclePromptsDeps) => useLifecyclePrompts(p), {
      initialProps: makeDeps({ dataFingerprint: 0, onBackup, backupThreshold: 3 }),
    });
    // Baseline is captured at fingerprint 0; grow it past the threshold.
    rerender(makeDeps({ dataFingerprint: 4, onBackup, backupThreshold: 3 }));
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current.prompt?.kind).toBe("backup");

    act(() => { result.current.act(); });
    expect(onBackup).toHaveBeenCalledTimes(1);
    expect(result.current.prompt).toBeNull();
    vi.useRealTimers();
  });

  it("snoozes the backup nudge on dismiss until more changes pile up", () => {
    const onBackup = vi.fn();
    const { result, rerender } = renderHook((p: LifecyclePromptsDeps) => useLifecyclePrompts(p), {
      initialProps: makeDeps({ dataFingerprint: 0, onBackup, backupThreshold: 3 }),
    });
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
});
