import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "@/App.tsx";
import { setHashRoute } from "@/test/testUtils.ts";
import type { Country } from "@/core/types.ts";
import { isEnabled } from "@/core/featureFlags.ts";
import { useBreakpoint } from "@/hooks/useBreakpoint.ts";
import { hasAnyLocalData, canAutoImport, restoreFromTarget, isBackupOverdue } from "@/utils/backup.ts";

const COUNTRY_NAMES = {
  JAPAN: "Japan",
  BRAZIL: "Brazil",
  CHILE: "Chile",
  PERU: "Peru",
} as const;

const ROUTES = {
  INVALID: "#invalid",
  TRIPS: "#trips",
} as const;

const NAV_TOUR_IDS = {
  TRIPS: "nav-trips",
} as const;

const TEST_IDS = {
  TRIPS_VIEW: "trips-view",
  TRIPS_COUNT: "trips-count",
} as const;

const FOOD_EXPERIENCE = "Food";

function navButton(tourId: string) {
  return document.querySelector(`button[data-tour="${tourId}"]`) as HTMLButtonElement;
}

const japan: Country = {
  name: COUNTRY_NAMES.JAPAN,
  lat: 35.6,
  lng: 139.7,
  region: "Asia",
  popularityScore: 88,
  bestMonths: ["April"],
  budget: "₹2L",
  experiences: [FOOD_EXPERIENCE],
};

const brazil: Country = {
  name: COUNTRY_NAMES.BRAZIL,
  lat: -15.7,
  lng: -47.8,
  region: "Americas",
  popularityScore: 70,
  bestMonths: ["May"],
  budget: "₹2L",
  experiences: ["Beach"],
};

let lastPlanViewProps: Record<string, unknown> | null = null;

const recordPlannedMock = vi.fn();
const updateNotesMock = vi.fn();
const storeReloadMock = vi.fn();

const recentsSet = new Set<string>([japan.name, brazil.name]);

vi.mock("@/components/views/MapView.tsx", () => ({
  default: () => <div data-testid="map-view" />,
}));

vi.mock("@/components/views/MyTripsView.tsx", () => ({
  default: (props: Record<string, unknown>) => {
    const savedTrips = (props.savedTrips as Array<{ id: string; name: string }>) ?? [];
    const onGoPlan = props.onGoPlan as (() => void) | undefined;
    return (
      <div data-testid="trips-view">
        <div data-testid={TEST_IDS.TRIPS_COUNT}>{savedTrips.length}</div>
        <button type="button" data-testid="trips-go-plan" onClick={() => onGoPlan?.()}>
          Plan a trip
        </button>
      </div>
    );
  },
}));

vi.mock("@/components/shared/DevFlagPanel.tsx", () => ({
  default: () => <div data-testid="dev-flag-panel" />,
}));

vi.mock("@/components/views/plan/PlanView.tsx", () => ({
  default: (props: Record<string, unknown>) => {
    lastPlanViewProps = props;
    return (
      <div data-testid="plan-view">
        <h1>Where do you plan to go next?</h1>
      </div>
    );
  },
}));

vi.mock("@/components/shared/FreTour.tsx", () => ({
  default: () => null,
}));

vi.mock("@/components/ai/ChatModal.tsx", () => ({
  default: (props: Record<string, unknown>) => {
    const onClose = props.onClose as (() => void) | undefined;
    const onSaveImportedPlan = props.onSaveImportedPlan as ((r: unknown) => void) | undefined;
    return (
      <div data-testid="chat-modal">
        <div data-testid="chat-initial">{(props.initialPrompt as string) ?? ""}</div>
        <button
          type="button"
          data-testid="chat-import"
          onClick={() => onSaveImportedPlan?.({ destinationName: "Chile", cities: [], plan: { duration: "", costPerPerson: "", days: [], note: "" } })}
        >Import</button>
        <button type="button" data-testid="chat-close" onClick={() => onClose?.()}>Close</button>
      </div>
    );
  },
}));

vi.mock("@/components/ai/AiItineraryModal.tsx", () => ({
  default: (props: Record<string, unknown>) => {
    const result = props.result as { destinationName: string };
    const onSaveToList = props.onSaveToList as ((name: string) => void) | undefined;
    const onClose = props.onClose as (() => void) | undefined;
    return (
      <div data-testid="ai-itinerary-modal">
        <div data-testid="ai-dest">{result.destinationName}</div>
        {onSaveToList && (
          <button type="button" data-testid="ai-save-to-list" onClick={() => onSaveToList(result.destinationName)}>Save to list</button>
        )}
        <button type="button" data-testid="ai-close" onClick={() => onClose?.()}>Close</button>
      </div>
    );
  },
}));

vi.mock("@/hooks/useInstallPrompt.ts", () => ({
  useInstallPrompt: () => ({
    canPrompt: false,
    isInstalled: false,
    isIOS: false,
    promptInstall: vi.fn(),
  }),
}));

vi.mock("@/utils/backup.ts", () => ({
  isBackupOverdue: vi.fn(() => false),
  autoBackupToTargetIfOverdue: vi.fn(() => Promise.resolve(false)),
  hasAnyLocalData: vi.fn(() => true),
  canAutoImport: vi.fn(() => Promise.resolve(false)),
  restoreFromTarget: vi.fn(() => Promise.resolve({ ok: false, msg: "" })),
}));

vi.mock("@/hooks/useCountryStore.ts", () => ({
  useCountryStore: () => ({
    allCountries: [japan, brazil],
    myListCountries: [japan, brazil],
    myListNames: [japan.name, brazil.name],
    recents: [japan.name, brazil.name],
    recentsSet,
    recordPlanned: recordPlannedMock,
    updateNotes: updateNotesMock,
    reload: storeReloadMock,
  }),
}));

vi.mock("@/hooks/useAiPlanStore.ts", () => ({
  useAiPlanStore: () => ({
    getPlans: () => [],
    deletePlan: vi.fn(),
    canAddNew: () => true,
    maxPlans: 3,
    savePlan: vi.fn(),
    replacePlan: vi.fn(),
    getAllDestinations: () => [],
    reload: vi.fn(),
  }),
}));

vi.mock("@/hooks/useBreakpoint.ts", () => ({
  useBreakpoint: vi.fn(() => "desktop"),
}));

vi.mock("@/core/featureFlags.ts", () => ({
  isEnabled: vi.fn(() => false),
}));

describe("App orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastPlanViewProps = null;
    vi.mocked(isEnabled).mockImplementation(() => false);
  });

  it("defaults to the Plan view when hash is invalid and supports top-level view switching", async () => {
    const user = userEvent.setup();
    window.history.pushState(null, "", ROUTES.INVALID);

    render(<App />);

    expect(await screen.findByRole("heading", { name: /Where do you plan to go next\?/i })).toBeInTheDocument();
    expect(window.location.hash).toBe("#plan");

    await user.click(navButton(NAV_TOUR_IDS.TRIPS));
    expect(await screen.findByTestId(TEST_IDS.TRIPS_VIEW)).toBeInTheDocument();
    expect(window.location.hash).toBe(ROUTES.TRIPS);
  });

  it("navigates to the Plan view (home) when the brand icon is clicked", async () => {
    const user = userEvent.setup();
    setHashRoute("trips");
    render(<App />);

    expect(await screen.findByTestId(TEST_IDS.TRIPS_VIEW)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Home" }));
    expect(await screen.findByRole("heading", { name: /Where do you plan to go next\?/i })).toBeInTheDocument();
    expect(window.location.hash).toBe("#plan");
  });

  it("passes AI planning handlers to PlanView only when llmPlanning is enabled", () => {
    vi.mocked(isEnabled).mockImplementation((flag) => flag === "llmPlanning");
    render(<App />);

    expect(lastPlanViewProps?.onPlanWithAi).toBeTypeOf("function");
    expect(lastPlanViewProps?.aiPlanCountFor).toBeTypeOf("function");
  });

  it("hides AI planning handlers on PlanView when llmPlanning is disabled", () => {
    vi.mocked(isEnabled).mockImplementation(() => false);
    render(<App />);

    expect(lastPlanViewProps?.onPlanWithAi).toBeUndefined();
    expect(lastPlanViewProps?.aiPlanCountFor).toBeUndefined();
  });
});

describe("App shell — pull-to-refresh, storage sync & mobile nav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastPlanViewProps = null;
    vi.mocked(isEnabled).mockImplementation(() => false);
    vi.mocked(useBreakpoint).mockReturnValue("desktop");
  });

  function pullContainer() {
    return document.querySelector("div.flex-1.relative.overflow-hidden") as HTMLElement;
  }

  it("shows the pull-to-refresh indicator while dragging and soft-refreshes past the threshold", async () => {
    vi.mocked(useBreakpoint).mockReturnValue("mobile");
    render(<App />);
    await screen.findByTestId("plan-view");
    const el = pullContainer();

    // A short pull surfaces the hint but stays below the trigger threshold.
    fireEvent.touchStart(el, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(el, { touches: [{ clientY: 60 }] });
    expect(screen.getByText(/Pull to refresh/i)).toBeInTheDocument();

    // Pulling further crosses the threshold and, on release, re-hydrates stores.
    fireEvent.touchMove(el, { touches: [{ clientY: 400 }] });
    expect(screen.getByText(/Release to refresh/i)).toBeInTheDocument();
    fireEvent.touchEnd(el);

    await waitFor(() => expect(storeReloadMock).toHaveBeenCalled());
    expect(screen.getByText(/Refreshing/i)).toBeInTheDocument();
  });

  it("surfaces a cross-tab storage-conflict banner and dismisses it", async () => {
    render(<App />);
    await screen.findByTestId("plan-view");

    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "tp_my_list", newValue: "[]" }));
    });

    expect(await screen.findByText(/changed in another tab/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText(/changed in another tab/i)).not.toBeInTheDocument();
  });

  it("renders the mobile bottom tab bar and switches views on tap", async () => {
    vi.mocked(useBreakpoint).mockReturnValue("mobile");
    const user = userEvent.setup();
    render(<App />);
    await screen.findByTestId("plan-view");

    const tripsTab = document.querySelector("nav button[data-tour='nav-trips']") as HTMLButtonElement;
    expect(tripsTab).toBeTruthy();
    await user.click(tripsTab);
    expect(await screen.findByTestId("trips-view")).toBeInTheDocument();
    expect(window.location.hash).toBe("#trips");
  });
});

describe("App handler wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastPlanViewProps = null;
    vi.mocked(isEnabled).mockImplementation(() => false);
  });

  it("wires store-backed handlers into PlanView", async () => {
    render(<App />);
    await screen.findByTestId("plan-view");

    act(() => {
      (lastPlanViewProps?.onUpdateNotes as (name: string, n: string) => void)(COUNTRY_NAMES.JAPAN, "Bring a jacket");
      (lastPlanViewProps?.onRecordPlanned as (names: string[]) => void)([COUNTRY_NAMES.JAPAN]);
    });

    expect(updateNotesMock).toHaveBeenCalledWith(COUNTRY_NAMES.JAPAN, "Bring a jacket");
    expect(recordPlannedMock).toHaveBeenCalledWith([COUNTRY_NAMES.JAPAN]);
  });

  it("routes Plan-with-AI into the chat modal, then imports a plan and saves it to the list", async () => {
    const user = userEvent.setup();
    vi.mocked(isEnabled).mockImplementation((flag) => flag === "llmPlanning");
    render(<App />);
    await screen.findByTestId("plan-view");

    act(() => {
      (lastPlanViewProps?.onPlanWithAi as (n: string) => void)(COUNTRY_NAMES.JAPAN);
    });

    const chat = await screen.findByTestId("chat-modal");
    expect(chat).toBeInTheDocument();
    expect(screen.getByTestId("chat-initial")).toHaveTextContent(/Plan a trip to Japan/);

    // Import a plan for a destination not already in My List.
    await user.click(screen.getByTestId("chat-import"));

    expect(await screen.findByTestId("ai-dest")).toHaveTextContent("Chile");
    await user.click(screen.getByTestId("ai-save-to-list"));
    expect(recordPlannedMock).toHaveBeenCalledWith(["Chile"]);
  });

  it("surfaces a cross-tab storage conflict banner and dismisses it", async () => {
    const user = userEvent.setup();
    setHashRoute("trips");
    render(<App />);
    expect(await screen.findByTestId(TEST_IDS.TRIPS_VIEW)).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "tp_my_list", newValue: "[]" }));
    });

    expect(await screen.findByText(/changed in another tab/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Dismiss$/i }));
    expect(screen.queryByText(/changed in another tab/i)).not.toBeInTheDocument();
  });
});

describe("App fresh-device restore offer", () => {
  const realLocation = window.location;

  function stubLocationReload(): ReturnType<typeof vi.fn> {
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        href: realLocation.href,
        hash: realLocation.hash,
        pathname: realLocation.pathname,
        search: realLocation.search,
        origin: realLocation.origin,
        host: realLocation.host,
        hostname: realLocation.hostname,
        protocol: realLocation.protocol,
        reload,
        assign: vi.fn(),
        replace: vi.fn(),
      },
    });
    return reload;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isEnabled).mockImplementation(() => false);
  });

  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: realLocation });
  });

  it("offers to restore when the device has no local data but a backup is importable, and dismisses", async () => {
    const user = userEvent.setup();
    vi.mocked(hasAnyLocalData).mockReturnValueOnce(false);
    vi.mocked(canAutoImport).mockResolvedValueOnce(true);

    render(<App />);

    const banner = await screen.findByText(/We found a saved backup/i);
    expect(banner).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /dismiss restore offer/i }));
    expect(screen.queryByText(/We found a saved backup/i)).not.toBeInTheDocument();
  });

  it("restores and reloads when the user accepts the offer", async () => {
    const user = userEvent.setup();
    vi.mocked(hasAnyLocalData).mockReturnValueOnce(false);
    vi.mocked(canAutoImport).mockResolvedValueOnce(true);
    vi.mocked(restoreFromTarget).mockResolvedValueOnce({ ok: true, msg: "Restored" });
    const reload = stubLocationReload();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: /^restore$/i }));

    await waitFor(() => expect(reload).toHaveBeenCalledOnce());
    expect(restoreFromTarget).toHaveBeenCalledOnce();
  });

  it("keeps the offer dismissed and does not reload when restore fails", async () => {
    const user = userEvent.setup();
    vi.mocked(hasAnyLocalData).mockReturnValueOnce(false);
    vi.mocked(canAutoImport).mockResolvedValueOnce(true);
    vi.mocked(restoreFromTarget).mockResolvedValueOnce({ ok: false, msg: "boom" });
    const reload = stubLocationReload();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: /^restore$/i }));

    await waitFor(() => expect(restoreFromTarget).toHaveBeenCalledOnce());
    expect(reload).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByText(/We found a saved backup/i)).not.toBeInTheDocument(),
    );
  });

  it("dismisses the backup-overdue reminder", async () => {
    const user = userEvent.setup();
    vi.mocked(isBackupOverdue).mockReturnValue(true);
    try {
      render(<App />);

      const banner = await screen.findByText(/haven't backed up recently/i);
      expect(banner).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Dismiss" }));
      expect(screen.queryByText(/haven't backed up recently/i)).not.toBeInTheDocument();
    } finally {
      vi.mocked(isBackupOverdue).mockReturnValue(false);
    }
  });
});
