import { describe, it, expect, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App";
import { LS_KEYS } from "../../core/lsKeys";
import { seedLocalStorage, setHashRoute } from "../testUtils";
import type { Country } from "../../core/types";

const baseCountry: Country = {
  name: "Japan",
  lat: 35.6,
  lng: 139.7,
  region: "Asia",
  popularityScore: 88,
  bestMonths: ["April"],
  budget: "₹2L",
  experiences: ["Food"],
};

vi.mock("../../components/views/MapView", () => ({
  default: () => <div data-testid="map-view" />,
}));

vi.mock("../../components/views/TripsView", () => ({
  default: () => <div data-testid="trips-view">Trips View</div>,
}));

vi.mock("../../components/views/CalendarView", () => ({
  default: () => <div data-testid="calendar-view">Calendar View</div>,
}));

vi.mock("../../components/views/DiscoverView", () => ({
  default: () => <div data-testid="discover-view">Discover View</div>,
}));

vi.mock("../../components/shared/HomeCountrySelector", () => ({
  default: ({ value }: { value: string }) => <div data-testid="home-country-value">{value}</div>,
}));

vi.mock("../../components/shared/DevFlagPanel", () => ({
  default: () => <div data-testid="dev-flag-panel" />,
}));

vi.mock("../../components/country/CountryPanel", () => ({
  default: () => null,
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
    allCountries: [baseCountry],
    myListCountries: [baseCountry],
    myListNames: [baseCountry.name],
    visited: { set: new Set<string>(), toggle: vi.fn() },
    favorites: { set: new Set<string>(), toggle: vi.fn() },
    myList: { set: new Set<string>([baseCountry.name]), add: vi.fn(), remove: vi.fn() },
    saveCountry: vi.fn(),
    deleteCountry: vi.fn(),
    updateNotes: vi.fn(),
    addToList: vi.fn(),
    catalog: [{ name: baseCountry.name, lat: baseCountry.lat, lng: baseCountry.lng, region: "Asia" }],
  }),
}));

vi.mock("../../hooks/useTripStore", () => ({
  useTripStore: () => ({
    mergedTripGroups: [],
    saveTrip: vi.fn(),
    deleteTrip: vi.fn(),
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

describe("App orchestration", () => {
  it("hydrates route and home country from browser state, then updates hash via nav", async () => {
    const user = userEvent.setup();
    seedLocalStorage({ [LS_KEYS.HOME_COUNTRY]: "Canada" });
    setHashRoute("calendar");

    await act(async () => {
      render(<App />);
    });

    expect(screen.getByTestId("home-country-value")).toHaveTextContent("Canada");
    expect(screen.getByTestId("calendar-view")).toBeInTheDocument();

    const discoverNav = document.querySelector('button[data-tour="nav-discover"]') as HTMLButtonElement;
    const tripsNav = document.querySelector('button[data-tour="nav-trips"]') as HTMLButtonElement;
    expect(discoverNav).toBeTruthy();
    expect(tripsNav).toBeTruthy();

    await user.click(discoverNav);
    expect(screen.getByTestId("discover-view")).toBeInTheDocument();
    expect(window.location.hash).toBe("#discover");

    await user.click(tripsNav);
    expect(screen.getByTestId("trips-view")).toBeInTheDocument();
    expect(window.location.hash).toBe("#trips");

    await act(async () => {});
  });
});
