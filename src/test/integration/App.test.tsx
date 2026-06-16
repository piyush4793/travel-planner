import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App";
import { LS_KEYS } from "../../core/lsKeys";
import { seedLocalStorage, setHashRoute } from "../testUtils";
import type { Country } from "../../core/types";
import { isEnabled } from "../../core/featureFlags";

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
  HOME_COUNTRY: "home-country-value",
  TRIPS_VIEW: "trips-view",
  CALENDAR_VIEW: "calendar-view",
  DISCOVER_VIEW: "discover-view",
  SELECTED_COUNTRY: "selected-country",
  TRIPS_SELECT_COUNTRY: "trips-select-country",
  COUNTRY_PANEL_CLOSE: "country-panel-close",
  CALENDAR_SELECT_COUNTRY: "calendar-select-country",
  CALENDAR_COUNT: "calendar-count",
  COUNTRY_PANEL_FILTER_FOOD: "country-panel-filter-food",
  TRIPS_COUNT: "trips-count",
  DISCOVER_ADD_COUNTRY: "discover-add-country",
  DISCOVER_REMOVE_COUNTRY: "discover-remove-country",
} as const;

const DEFAULT_HOME_COUNTRY = "Canada";
const FOOD_EXPERIENCE = "Food";
const BR_PRESENT_COUNTRIES_COUNT = "2";
const JP_ONLY_COUNTRIES_COUNT = "1";

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

vi.mock("../../components/shared/HomeCountrySelector", () => ({
  default: ({ value }: { value: string }) => <div data-testid={TEST_IDS.HOME_COUNTRY}>{value}</div>,
}));

vi.mock("../../components/shared/DevFlagPanel", () => ({
  default: () => <div data-testid="dev-flag-panel" />,
}));

vi.mock("../../components/country/CountryPanel", () => ({
  default: (props: Record<string, unknown>) => {
    lastCountryPanelProps = props;
    const country = props.country as Country | null;
    const onClose = props.onClose as (() => void) | undefined;
    const onFilterExperience = props.onFilterExperience as ((tag: string) => void) | undefined;
    return (
      <div data-testid="country-panel">
      <div data-testid={TEST_IDS.SELECTED_COUNTRY}>{country?.name ?? "none"}</div>
      <button type="button" data-testid={TEST_IDS.COUNTRY_PANEL_CLOSE} onClick={() => onClose?.()}>
          Close
        </button>
        <button
          type="button"
        data-testid={TEST_IDS.COUNTRY_PANEL_FILTER_FOOD}
        onClick={() => onFilterExperience?.(FOOD_EXPERIENCE)}
        >
          Filter Food
        </button>
      </div>
    );
  },
}));

vi.mock("../../components/shared/FreTour", () => ({
  default: () => null,
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
  isBackupOverdue: () => false,
  autoBackupIfOverdue: () => false,
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
    seedLocalStorage({ [LS_KEYS.HOME_COUNTRY]: DEFAULT_HOME_COUNTRY });
    window.history.pushState(null, "", ROUTES.INVALID);

    render(<App />);

    expect(screen.getByTestId(TEST_IDS.HOME_COUNTRY)).toHaveTextContent(DEFAULT_HOME_COUNTRY);
    expect(await screen.findByTestId(TEST_IDS.TRIPS_VIEW)).toBeInTheDocument();
    expect(window.location.hash).toBe(ROUTES.TRIPS);

    await user.click(navButton(NAV_TOUR_IDS.CALENDAR));
    expect(await screen.findByTestId(TEST_IDS.CALENDAR_VIEW)).toBeInTheDocument();
    expect(window.location.hash).toBe(ROUTES.CALENDAR);

    await user.click(navButton(NAV_TOUR_IDS.DISCOVER));
    expect(await screen.findByTestId(TEST_IDS.DISCOVER_VIEW)).toBeInTheDocument();
    expect(window.location.hash).toBe(ROUTES.DISCOVER);
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

  it("applies experience filter to Calendar results but keeps Trips result set unchanged", async () => {
    const user = userEvent.setup();
    setHashRoute("calendar");
    render(<App />);

    expect(screen.getByTestId(TEST_IDS.CALENDAR_COUNT)).toHaveTextContent(BR_PRESENT_COUNTRIES_COUNT);

    await user.click(screen.getByTestId(TEST_IDS.COUNTRY_PANEL_FILTER_FOOD));
    expect(screen.getByTestId(TEST_IDS.CALENDAR_COUNT)).toHaveTextContent(JP_ONLY_COUNTRIES_COUNT);

    await user.click(navButton(NAV_TOUR_IDS.TRIPS));
    expect(screen.getByTestId(TEST_IDS.TRIPS_COUNT)).toHaveTextContent(BR_PRESENT_COUNTRIES_COUNT);
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
