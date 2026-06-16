import { act } from "@testing-library/react";
import { vi } from "vitest";
import { LS_KEYS } from "../core/lsKeys";

type LsKey = (typeof LS_KEYS)[keyof typeof LS_KEYS];

export function seedLocalStorage(values: Partial<Record<LsKey, unknown>>) {
  for (const [key, value] of Object.entries(values)) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

export function setHashRoute(view: "trips" | "calendar" | "discover") {
  window.history.pushState(null, "", `#${view}`);
}

export function useDeterministicTimers() {
  vi.useFakeTimers();
  return {
    advanceBy: (ms: number) => act(() => vi.advanceTimersByTime(ms)),
    restore: () => {
      vi.runOnlyPendingTimers();
      vi.useRealTimers();
    },
  };
}
