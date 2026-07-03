import userEvent from "@testing-library/user-event";

export function setHashRoute(view: "trips" | "calendar" | "discover") {
  window.history.pushState(null, "", `#${view}`);
}

/**
 * userEvent instance with inter-keystroke delay disabled. The default delay
 * relies on `setTimeout` scheduling, which is unreliable on constrained CI
 * runners and can silently drop `type()` input — making dirty-state assertions
 * flaky. `delay: null` makes typing deterministic and timer-independent.
 */
export function setupUser() {
  return userEvent.setup({ delay: null });
}

