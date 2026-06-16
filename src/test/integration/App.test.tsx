import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App";
import { LS_KEYS } from "../../core/lsKeys";
import { seedLocalStorage, setHashRoute } from "../testUtils";
import type { Country } from "../../core/types";
import { isEnabled } from "../../core/featureFlags";

const japan: Country = {
  name: "Japan",
  lat: 35.6,
  lng: 139.7,
  region: "Asia",
  popularityScore: 88,
  bestMonths: ["April"],
  budget: "₹2L",
  experiences: ["Food"],
};

const brazil: Country = {
  name: "Brazil",
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
        <div data-testid="trips-count">{countries.length}</div>
        <button
          type="button"
          data-testid="trips-select-country"
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
        <div data-testid="calendar-count">{countries.length}</div>
        <button
          type="button"
          data-testid="calendar-select-country"
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
      <div data-testid="discover-view">
        Discover View
        <button
          type="button"
          data-testid="discover-add-country"
          onClick={() => onAddToList?.("Chile")}
        >
          Add Chile
        </button>
        <button
          type="button"
          data-testid="discover-remove-country"
          onClick={() => onRemoveFromList?.("Japan")}
        >
          Remove Japan
        </button>
      </div>
    );
  },
}));

vi.mock("../../components/shared/HomeCountrySelector", () => ({
  default: ({ value }: { value: string }) => <div data-testid="home-country-value">{value}</div>,
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
        <div data-testid="selected-country">{country?.name ?? "none"}</div>
        <button type="button" data-testid="country-panel-close" onClick={() => onClose?.()}>
          Close
        </button>
        <button
          type="button"
          data-testid="country-panel-filter-food"
          onClick={() => onFilterExperience?.("Food")}
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
    seedLocalStorage({ [LS_KEYS.HOME_COUNTRY]: "Canada" });
    window.history.pushState(null, "", "#invalid");

    render(<App />);

    expect(screen.getByTestId("home-country-value")).toHaveTextContent("Canada");
    expect(screen.getByTestId("trips-view")).toBeInTheDocument();
    expect(window.location.hash).toBe("#trips");

    await user.click(document.querySelector('button[data-tour="nav-calendar"]') as HTMLButtonElement);
    expect(screen.getByTestId("calendar-view")).toBeInTheDocument();
    expect(window.location.hash).toBe("#calendar");

    await user.click(document.querySelector('button[data-tour="nav-discover"]') as HTMLButtonElement);
    expect(screen.getByTestId("discover-view")).toBeInTheDocument();
    expect(window.location.hash).toBe("#discover");
  });

  it("wires country selection from Trips and Calendar into CountryPanel", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByTestId("selected-country")).toHaveTextContent("none");

    await user.click(screen.getByTestId("trips-select-country"));
    expect(screen.getByTestId("selected-country")).toHaveTextContent("Japan");

    await user.click(screen.getByTestId("country-panel-close"));
    expect(screen.getByTestId("selected-country")).toHaveTextContent("none");

    await user.click(document.querySelector('button[data-tour="nav-calendar"]') as HTMLButtonElement);
    await user.click(screen.getByTestId("calendar-select-country"));
    expect(screen.getByTestId("selected-country")).toHaveTextContent("Japan");
  });

  it("applies experience filter to Calendar results but keeps Trips result set unchanged", async () => {
    const user = userEvent.setup();
    setHashRoute("calendar");
    render(<App />);

    expect(screen.getByTestId("calendar-count")).toHaveTextContent("2");

    await user.click(screen.getByTestId("country-panel-filter-food"));
    expect(screen.getByTestId("calendar-count")).toHaveTextContent("1");

    await user.click(document.querySelector('button[data-tour="nav-trips"]') as HTMLButtonElement);
    expect(screen.getByTestId("trips-count")).toHaveTextContent("2");
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

    await user.click(document.querySelector('button[data-tour="nav-discover"]') as HTMLButtonElement);
    await user.click(screen.getByTestId("discover-add-country"));
    await user.click(screen.getByTestId("discover-remove-country"));

    expect(addToListMock).toHaveBeenCalledWith("Chile");
    expect(removeFromListMock).toHaveBeenCalledWith("Japan");
  });
});
