import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App";
import { setHashRoute } from "../testUtils";
import type { Country } from "../../core/types";
import { isEnabled } from "../../core/featureFlags";
import { hasAnyLocalData, canAutoImport, restoreFromTarget, isBackupOverdue } from "../../utils/backup";

const COUNTRY_NAMES = {
  JAPAN: "Japan",
  BRAZIL: "Brazil",
  CHILE: "Chile",
} as const;

const ROUTES = {
  INVALID: "#invalid",
  TRIPS: "#trips",
  CALENDAR: "#calendar",
  DISCOVER: "#discover",
} as const;

const NAV_TOUR_IDS = {
  TRIPS: "nav-trips",
  CALENDAR: "nav-calendar",
  DISCOVER: "nav-discover",
} as const;

const TEST_IDS = {
  TRIPS_VIEW: "trips-view",
  CALENDAR_VIEW: "calendar-view",
  DISCOVER_VIEW: "discover-view",
  SELECTED_COUNTRY: "selected-country",
  TRIPS_SELECT_COUNTRY: "trips-select-country",
  COUNTRY_PANEL_CLOSE: "country-panel-close",
  CALENDAR_SELECT_COUNTRY: "calendar-select-country",
  CALENDAR_COUNT: "calendar-count",
  TRIPS_COUNT: "trips-count",
  TRIPS_FILTER_MONTH: "trips-filter-month",
  DISCOVER_ADD_COUNTRY: "discover-add-country",
  DISCOVER_REMOVE_COUNTRY: "discover-remove-country",
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

let lastCountryPanelProps: Record<string, unknown> | null = null;

const addToListMock = vi.fn();
const removeFromListMock = vi.fn();
const saveCountryMock = vi.fn();
const deleteCountryMock = vi.fn();
const updateNotesMock = vi.fn();
const visitedToggleMock = vi.fn();
const favoritesToggleMock = vi.fn();
const saveTripMock = vi.fn();
const deleteTripMock = vi.fn();

const visitedSet = new Set<string>();
const favoritesSet = new Set<string>();
const myListSet = new Set<string>([japan.name, brazil.name]);

vi.mock("../../components/views/MapView", () => ({
  default: () => <div data-testid="map-view" />,
}));

vi.mock("../../components/views/TripsView", () => ({
  default: (props: Record<string, unknown>) => {
    const countries = (props.countries as Country[]) ?? [];
    const onSelect = props.onSelect as ((c: Country) => void) | undefined;
    const setMonth = props.setMonth as ((m: string[]) => void) | undefined;
    return (
      <div data-testid="trips-view">
        <div data-testid={TEST_IDS.TRIPS_COUNT}>{countries.length}</div>
        <button
          type="button"
          data-testid={TEST_IDS.TRIPS_SELECT_COUNTRY}
          onClick={() => onSelect?.(countries[0])}
        >
          Select trip country
        </button>
        <button
          type="button"
          data-testid={TEST_IDS.TRIPS_FILTER_MONTH}
          onClick={() => setMonth?.(["December"])}
        >
          Filter December
        </button>
      </div>
    );
  },
}));

vi.mock("../../components/views/CalendarView", () => ({
  default: (props: Record<string, unknown>) => {
    const countries = (props.countries as Country[]) ?? [];
    const onSelect = props.onSelect as ((c: Country) => void) | undefined;
    return (
      <div data-testid="calendar-view">
        <div data-testid={TEST_IDS.CALENDAR_COUNT}>{countries.length}</div>
        <button
          type="button"
          data-testid={TEST_IDS.CALENDAR_SELECT_COUNTRY}
          onClick={() => onSelect?.(countries[0])}
        >
          Select calendar country
        </button>
      </div>
    );
  },
}));

vi.mock("../../components/views/DiscoverView", () => ({
  default: (props: Record<string, unknown>) => {
    const onAddToList = props.onAddToList as ((name: string) => void) | undefined;
    const onRemoveFromList = props.onRemoveFromList as ((name: string) => void) | undefined;
    return (
      <div data-testid={TEST_IDS.DISCOVER_VIEW}>
        Discover View
        <button
          type="button"
          data-testid={TEST_IDS.DISCOVER_ADD_COUNTRY}
          onClick={() => onAddToList?.(COUNTRY_NAMES.CHILE)}
        >
          Add {COUNTRY_NAMES.CHILE}
        </button>
        <button
          type="button"
          data-testid={TEST_IDS.DISCOVER_REMOVE_COUNTRY}
          onClick={() => onRemoveFromList?.(COUNTRY_NAMES.JAPAN)}
        >
          Remove {COUNTRY_NAMES.JAPAN}
        </button>
      </div>
    );
  },
}));

vi.mock("../../components/shared/DevFlagPanel", () => ({
  default: () => <div data-testid="dev-flag-panel" />,
}));

vi.mock("../../components/country/CountryPanel", () => ({
  default: (props: Record<string, unknown>) => {
    lastCountryPanelProps = props;
    const country = props.country as Country | null;
    const onClose = props.onClose as (() => void) | undefined;
    return (
      <div data-testid="country-panel">
      <div data-testid={TEST_IDS.SELECTED_COUNTRY}>{country?.name ?? "none"}</div>
      <button type="button" data-testid={TEST_IDS.COUNTRY_PANEL_CLOSE} onClick={() => onClose?.()}>
          Close
        </button>
      </div>
    );
  },
}));

vi.mock("../../components/shared/FreTour", () => ({
  default: () => null,
}));

vi.mock("../../components/country/CountryForm", () => ({
  default: (props: Record<string, unknown>) => {
    const initial = props.initial as Country;
    const onSave = props.onSave as ((c: Country) => void) | undefined;
    const onClose = props.onClose as (() => void) | undefined;
    return (
      <div data-testid="country-form">
        <button type="button" data-testid="form-save" onClick={() => onSave?.({ ...initial, budget: "₹3L" })}>Save</button>
        <button type="button" data-testid="form-close" onClick={() => onClose?.()}>Close</button>
      </div>
    );
  },
}));

vi.mock("../../components/ai/ChatModal", () => ({
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

vi.mock("../../components/ai/AiItineraryModal", () => ({
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

vi.mock("../../hooks/useInstallPrompt", () => ({
  useInstallPrompt: () => ({
    canPrompt: false,
    isInstalled: false,
    isIOS: false,
    promptInstall: vi.fn(),
  }),
}));

vi.mock("../../utils/backup", () => ({
  isBackupOverdue: vi.fn(() => false),
  autoBackupToTargetIfOverdue: vi.fn(() => Promise.resolve(false)),
  hasAnyLocalData: vi.fn(() => true),
  canAutoImport: vi.fn(() => Promise.resolve(false)),
  restoreFromTarget: vi.fn(() => Promise.resolve({ ok: false, msg: "" })),
}));

vi.mock("../../hooks/useCountryStore", () => ({
  useCountryStore: () => ({
    allCountries: [japan, brazil],
    myListCountries: [japan, brazil],
    myListNames: [japan.name, brazil.name],
    visited: { set: visitedSet, toggle: visitedToggleMock },
    favorites: { set: favoritesSet, toggle: favoritesToggleMock },
    myList: { set: myListSet, add: addToListMock, remove: removeFromListMock },
    saveCountry: saveCountryMock,
    deleteCountry: deleteCountryMock,
    updateNotes: updateNotesMock,
    addToList: addToListMock,
    catalog: [
      { name: japan.name, lat: japan.lat, lng: japan.lng, region: "Asia" },
      { name: brazil.name, lat: brazil.lat, lng: brazil.lng, region: "Americas" },
    ],
  }),
}));

vi.mock("../../hooks/useTripStore", () => ({
  useTripStore: () => ({
    mergedTripGroups: [],
    saveTrip: saveTripMock,
    deleteTrip: deleteTripMock,
  }),
}));

vi.mock("../../hooks/useAiPlanStore", () => ({
  useAiPlanStore: () => ({
    getPlans: () => [],
    deletePlan: vi.fn(),
    canAddNew: () => true,
    maxPlans: 3,
    savePlan: vi.fn(),
    replacePlan: vi.fn(),
    getAllDestinations: () => [],
  }),
}));

vi.mock("../../hooks/useBreakpoint", () => ({
  useBreakpoint: () => "desktop",
}));

vi.mock("../../core/featureFlags", () => ({
  isEnabled: vi.fn(() => false),
}));

describe("App orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastCountryPanelProps = null;
    vi.mocked(isEnabled).mockImplementation(() => false);
  });

  it("defaults to trips view when hash is invalid and supports top-level view switching", async () => {
    const user = userEvent.setup();
    window.history.pushState(null, "", ROUTES.INVALID);

    render(<App />);

    expect(await screen.findByTestId(TEST_IDS.TRIPS_VIEW)).toBeInTheDocument();
    expect(window.location.hash).toBe(ROUTES.TRIPS);

    await user.click(navButton(NAV_TOUR_IDS.CALENDAR));
    expect(await screen.findByTestId(TEST_IDS.CALENDAR_VIEW)).toBeInTheDocument();
    expect(window.location.hash).toBe(ROUTES.CALENDAR);

    await user.click(navButton(NAV_TOUR_IDS.DISCOVER));
    expect(await screen.findByTestId(TEST_IDS.DISCOVER_VIEW)).toBeInTheDocument();
    expect(window.location.hash).toBe(ROUTES.DISCOVER);
  });

  it("lands on the guided Plan view when guided planning is enabled", async () => {
    vi.mocked(isEnabled).mockImplementation((flag) => flag === "guidedPlanning");
    window.history.pushState(null, "", ROUTES.INVALID);

    render(<App />);

    expect(await screen.findByRole("heading", { name: /Where do you plan to go next\?/i })).toBeInTheDocument();
    expect(window.location.hash).toBe("#plan");
  });

  it("navigates to trips (home) when brand icon is clicked", async () => {
    const user = userEvent.setup();
    setHashRoute("discover");
    render(<App />);

    expect(await screen.findByTestId(TEST_IDS.DISCOVER_VIEW)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Home" }));
    expect(await screen.findByTestId(TEST_IDS.TRIPS_VIEW)).toBeInTheDocument();
    expect(window.location.hash).toBe(ROUTES.TRIPS);
  });

  it("wires country selection from Trips and Calendar into CountryPanel", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByTestId(TEST_IDS.SELECTED_COUNTRY)).toHaveTextContent("none");

    await user.click(screen.getByTestId(TEST_IDS.TRIPS_SELECT_COUNTRY));
    expect(screen.getByTestId(TEST_IDS.SELECTED_COUNTRY)).toHaveTextContent(COUNTRY_NAMES.JAPAN);

    await user.click(screen.getByTestId(TEST_IDS.COUNTRY_PANEL_CLOSE));
    expect(screen.getByTestId(TEST_IDS.SELECTED_COUNTRY)).toHaveTextContent("none");

    await user.click(navButton(NAV_TOUR_IDS.CALENDAR));
    await user.click(screen.getByTestId(TEST_IDS.CALENDAR_SELECT_COUNTRY));
    expect(screen.getByTestId(TEST_IDS.SELECTED_COUNTRY)).toHaveTextContent(COUNTRY_NAMES.JAPAN);
  });

  it("shows the whole My List in Calendar even when a Trips month filter is active", async () => {
    const user = userEvent.setup();
    render(<App />);

    // A month filter that matches neither seeded country empties the Trips list…
    await user.click(screen.getByTestId(TEST_IDS.TRIPS_FILTER_MONTH));
    expect(screen.getByTestId(TEST_IDS.TRIPS_COUNT)).toHaveTextContent("0");

    // …but Calendar is a heatmap of the full My List and must ignore that filter.
    await user.click(navButton(NAV_TOUR_IDS.CALENDAR));
    expect(await screen.findByTestId(TEST_IDS.CALENDAR_VIEW)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.CALENDAR_COUNT)).toHaveTextContent("2");
  });

  it("passes AI planning handlers to CountryPanel only when llmPlanning is enabled", () => {
    vi.mocked(isEnabled).mockImplementation((flag) => flag === "llmPlanning");
    render(<App />);

    expect(lastCountryPanelProps?.onPlanWithAi).toBeTypeOf("function");
    expect(lastCountryPanelProps?.aiPlans).toEqual([]);
    expect(lastCountryPanelProps?.onDeleteAiPlan).toBeTypeOf("function");
  });

  it("hides AI planning handlers on CountryPanel when llmPlanning is disabled", () => {
    vi.mocked(isEnabled).mockImplementation(() => false);
    render(<App />);

    expect(lastCountryPanelProps?.onPlanWithAi).toBeUndefined();
    expect(lastCountryPanelProps?.aiPlans).toBeUndefined();
    expect(lastCountryPanelProps?.onDeleteAiPlan).toBeUndefined();
  });

  it("wires Discover add/remove actions to country store callbacks", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(navButton(NAV_TOUR_IDS.DISCOVER));
    await user.click(screen.getByTestId(TEST_IDS.DISCOVER_ADD_COUNTRY));
    await user.click(screen.getByTestId(TEST_IDS.DISCOVER_REMOVE_COUNTRY));

    expect(addToListMock).toHaveBeenCalledWith(COUNTRY_NAMES.CHILE);
    expect(removeFromListMock).toHaveBeenCalledWith(COUNTRY_NAMES.JAPAN);
  });
});

describe("App handler wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastCountryPanelProps = null;
    vi.mocked(isEnabled).mockImplementation(() => false);
  });

  async function selectJapan(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByTestId(TEST_IDS.TRIPS_SELECT_COUNTRY));
    expect(screen.getByTestId(TEST_IDS.SELECTED_COUNTRY)).toHaveTextContent(COUNTRY_NAMES.JAPAN);
  }

  it("saves note edits through the country store and keeps the panel in sync", async () => {
    const user = userEvent.setup();
    render(<App />);
    await selectJapan(user);

    await act(async () => {
      (lastCountryPanelProps?.onUpdateNotes as (n: string) => void)("Bring a jacket");
    });

    expect(updateNotesMock).toHaveBeenCalledWith(COUNTRY_NAMES.JAPAN, "Bring a jacket");
  });

  it("toggles favorite and visited state via the store", async () => {
    const user = userEvent.setup();
    render(<App />);
    await selectJapan(user);

    act(() => {
      (lastCountryPanelProps?.onToggleFavorite as () => void)();
      (lastCountryPanelProps?.onToggleVisited as () => void)();
    });

    expect(favoritesToggleMock).toHaveBeenCalledWith(COUNTRY_NAMES.JAPAN);
    expect(visitedToggleMock).toHaveBeenCalledWith(COUNTRY_NAMES.JAPAN);
  });

  it("resolveCountry returns tracked countries and null for unknown names", async () => {
    const user = userEvent.setup();
    render(<App />);
    await selectJapan(user);

    const resolve = lastCountryPanelProps?.resolveCountry as (n: string) => Country | null;
    expect(resolve(COUNTRY_NAMES.JAPAN)?.name).toBe(COUNTRY_NAMES.JAPAN);
    expect(resolve("Atlantis")).toBeNull();
  });

  it("opens the edit form and persists edits via handleSave", async () => {
    const user = userEvent.setup();
    render(<App />);
    await selectJapan(user);

    act(() => {
      (lastCountryPanelProps?.onEdit as () => void)();
    });

    await user.click(await screen.findByTestId("form-save"));

    expect(saveCountryMock).toHaveBeenCalledWith(expect.objectContaining({ name: COUNTRY_NAMES.JAPAN, budget: "₹3L" }));
    expect(screen.queryByTestId("country-form")).not.toBeInTheDocument();
  });

  it("routes Plan-with-AI into the chat modal, then imports a plan and saves it to the list", async () => {
    const user = userEvent.setup();
    vi.mocked(isEnabled).mockImplementation((flag) => flag === "llmPlanning");
    render(<App />);
    await selectJapan(user);

    act(() => {
      (lastCountryPanelProps?.onPlanWithAi as (n: string) => void)(COUNTRY_NAMES.JAPAN);
    });

    const chat = await screen.findByTestId("chat-modal");
    expect(chat).toBeInTheDocument();
    expect(screen.getByTestId("chat-initial")).toHaveTextContent(/Plan a trip to Japan/);

    // Import a plan for a destination not already in My List.
    await user.click(screen.getByTestId("chat-import"));

    expect(await screen.findByTestId("ai-dest")).toHaveTextContent("Chile");
    await user.click(screen.getByTestId("ai-save-to-list"));
    expect(addToListMock).toHaveBeenCalledWith("Chile");
  });

  it("surfaces a cross-tab storage conflict banner and dismisses it", async () => {
    const user = userEvent.setup();
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
