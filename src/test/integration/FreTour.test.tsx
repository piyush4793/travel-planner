import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FreTour from "../../components/shared/FreTour";
import { LS_KEYS } from "../../core/lsKeys";
import { loadLS, saveLS } from "../../core/storage";

type FreTourProps = React.ComponentProps<typeof FreTour>;

const defaultProps: FreTourProps = {
  canPromptInstall: false,
  isInstalled: false,
  isIOS: false,
  onInstall: vi.fn().mockResolvedValue(false),
};

function mockMatchMedia(matchesForMobile = false, matchesForReducedMotion = true) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? matchesForReducedMotion : matchesForMobile,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

async function openTour(props: Partial<FreTourProps> = {}) {
  const view = render(<FreTour {...defaultProps} {...props} />);

  await act(async () => {
    vi.advanceTimersByTime(600);
  });

  expect(screen.getByRole("dialog", { name: /welcome tour/i })).toBeInTheDocument();
  vi.useRealTimers();
  const user = userEvent.setup({ delay: null });
  return { user, ...view };
}

async function goToInstallStep(user: ReturnType<typeof userEvent.setup>) {
  for (let i = 0; i < 7; i += 1) {
    await user.click(screen.getByRole("button", { name: /Next/i }));
  }
  expect(screen.getByRole("heading", { name: /Take Roamwise Anywhere/i })).toBeInTheDocument();
}

describe("FreTour", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
    mockMatchMedia();
  });

  it("renders the first tour step on a fresh localStorage after the first-run delay", async () => {
    render(<FreTour {...defaultProps} />);

    expect(screen.queryByRole("dialog", { name: /welcome tour/i })).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(screen.getByRole("heading", { name: /Welcome to Roamwise/i })).toBeInTheDocument();
    expect(screen.getByText(/Your personal travel companion for 197 countries/i)).toBeInTheDocument();
  });

  it("does not render when the first-run tour has already been seen", async () => {
    saveLS(LS_KEYS.FRE_DONE, true);

    render(<FreTour {...defaultProps} />);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByRole("dialog", { name: /welcome tour/i })).not.toBeInTheDocument();
  });

  it("moves forward and backward through tour steps", async () => {
    const { user } = await openTour();

    await user.click(screen.getByRole("button", { name: /Next/i }));
    expect(screen.getByRole("heading", { name: /Plan Your Trip/i })).toBeInTheDocument();
    expect(screen.getByText(/shape a day-by-day itinerary/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Back/i }));
    expect(screen.getByRole("heading", { name: /Welcome to Roamwise/i })).toBeInTheDocument();
  });

  it("surfaces the saved-trips step in the Plan-first journey", async () => {
    const { user } = await openTour();

    await user.click(screen.getByRole("button", { name: /Next/i })); // Plan
    await user.click(screen.getByRole("button", { name: /Next/i })); // Trips
    expect(screen.getByRole("heading", { name: /Your Saved Trips/i })).toBeInTheDocument();
    expect(screen.getByText(/pick up right where you left off/i)).toBeInTheDocument();
  });

  it("skip closes the tour and persists the seen flag", async () => {
    const { user, rerender } = await openTour();

    await user.click(screen.getByRole("button", { name: /Skip tour/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /welcome tour/i })).not.toBeInTheDocument();
    });
    expect(loadLS(LS_KEYS.FRE_DONE, false)).toBe(true);

    rerender(<FreTour {...defaultProps} />);
    expect(screen.queryByRole("dialog", { name: /welcome tour/i })).not.toBeInTheDocument();
  });

  it("completing the final step closes the tour and persists the seen flag", async () => {
    const { user } = await openTour();

    for (let i = 0; i < 8; i += 1) {
      await user.click(screen.getByRole("button", { name: /Next/i }));
    }

    expect(screen.getByRole("heading", { name: /You’re Ready to Explore!/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Let’s Go/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /welcome tour/i })).not.toBeInTheDocument();
    });
    expect(loadLS(LS_KEYS.FRE_DONE, false)).toBe(true);
  });

  it("shows the install CTA when promptable and calls onInstall", async () => {
    const onInstall = vi.fn().mockResolvedValue(true);
    const { user } = await openTour({ canPromptInstall: true, onInstall });

    await goToInstallStep(user);
    await user.click(screen.getByRole("button", { name: /Install Roamwise/i }));

    expect(onInstall).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /You’re Ready to Explore!/i })).toBeInTheDocument();
    });
  });

  it("shows iOS add-to-home-screen guidance instead of the install CTA", async () => {
    const { user } = await openTour({ isIOS: true });

    await goToInstallStep(user);

    expect(screen.getByText(/Add Roamwise to your home screen/i)).toBeInTheDocument();
    expect(screen.getByText(/Add to Home Screen/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Install Roamwise/i })).not.toBeInTheDocument();
  });

  it("does not show the install CTA when already installed", async () => {
    const { user } = await openTour({ canPromptInstall: true, isInstalled: true });

    await goToInstallStep(user);

    expect(screen.getByText(/Roamwise is already installed on your device/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Install Roamwise/i })).not.toBeInTheDocument();
  });

  it("Escape closes the tour, persists seen, and returns focus", async () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Open settings";
    document.body.appendChild(trigger);
    trigger.focus();

    const { user } = await openTour();

    expect(document.activeElement).not.toBe(trigger);
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /welcome tour/i })).not.toBeInTheDocument();
    });
    expect(loadLS(LS_KEYS.FRE_DONE, false)).toBe(true);
    expect(document.activeElement).toBe(trigger);

    trigger.remove();
  });

  it("renders floating emoji decorations when motion is allowed", async () => {
    mockMatchMedia(false, false); // not mobile, motion allowed
    await openTour();

    const dialog = screen.getByRole("dialog", { name: /welcome tour/i });
    const decorations = dialog.querySelectorAll('[aria-hidden="true"] span');
    expect(decorations.length).toBeGreaterThan(0);
  });

  it("renders a spotlight backdrop over a visible target element", async () => {
    const target = document.createElement("button");
    target.setAttribute("data-tour", "nav-plan");
    target.getBoundingClientRect = () =>
      ({ left: 20, top: 30, width: 100, height: 40, right: 120, bottom: 70, x: 20, y: 30, toJSON: () => ({}) }) as DOMRect;
    document.body.appendChild(target);

    const { user } = await openTour();
    await user.click(screen.getByRole("button", { name: /Next/i }));

    expect(screen.getByRole("heading", { name: /Plan Your Trip/i })).toBeInTheDocument();
    const dialog = screen.getByRole("dialog", { name: /welcome tour/i });
    await waitFor(() => {
      const cutout = [...dialog.querySelectorAll<HTMLElement>('div[aria-hidden="true"]')].find(
        (el) => el.style.boxShadow.includes("9999px"),
      );
      expect(cutout).toBeTruthy();
    });

    target.remove();
  });

  it("traps focus within the dialog when tabbing past the boundaries", async () => {
    const { user } = await openTour();
    const dialog = screen.getByRole("dialog", { name: /welcome tour/i });
    const focusable = dialog.querySelectorAll<HTMLElement>("button");
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    last.focus();
    await user.tab();
    expect(document.activeElement).toBe(first);

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(last);
  });
});
