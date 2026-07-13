import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import MapView from "@/components/views/MapView.tsx";
import type { Country } from "@/core/types.ts";

// ── Fake maplibre-gl ─────────────────────────────────────────────────────────
// MapView can't mount a real WebGL map in jsdom, so we replace maplibre-gl with
// a minimal fake that records construction + marker wiring. This lets us assert
// MapView's imperative glue (map lifecycle, per-country markers, event → onSelect,
// hover → HoverCard) without a GPU context.
const h = vi.hoisted(() => {
  const maps: any[] = [];
  const markers: any[] = [];
  const state = { styleLoaded: true, existingSources: [] as string[] };

  class FakeMap {
    opts: Record<string, unknown>;
    loadCbs: Array<() => void> = [];
    addControl = vi.fn();
    on = vi.fn();
    off = vi.fn();
    remove = vi.fn();
    setData = vi.fn();
    removeLayer = vi.fn();
    removeSource = vi.fn();
    isStyleLoaded = () => state.styleLoaded;
    getSource = vi.fn((id: string) =>
      state.existingSources.includes(id) ? { setData: this.setData } : undefined,
    );
    getLayer = vi.fn((id: string) => (state.existingSources.includes(id) ? {} : undefined));
    once = vi.fn((ev: string, cb: () => void) => {
      if (ev === "load") this.loadCbs.push(cb);
    });
    fireLoad() {
      this.loadCbs.forEach((cb) => cb());
    }
    constructor(opts: Record<string, unknown>) {
      this.opts = opts;
      maps.push(this);
    }
  }

  class FakeMarker {
    element: HTMLElement;
    lngLat: [number, number] | null = null;
    removed = false;
    constructor(opts: { element: HTMLElement }) {
      this.element = opts.element;
      markers.push(this);
    }
    setLngLat(ll: [number, number]) {
      this.lngLat = ll;
      return this;
    }
    addTo() {
      return this;
    }
    remove() {
      this.removed = true;
    }
  }

  return { maps, markers, state, FakeMap, FakeMarker };
});

const { maps, markers } = h;

vi.mock("maplibre-gl", () => ({
  default: {
    Map: h.FakeMap,
    Marker: h.FakeMarker,
    NavigationControl: class {},
  },
  Map: h.FakeMap,
  Marker: h.FakeMarker,
  NavigationControl: class {},
}));

vi.mock("@/utils/wikiImages.ts", () => ({
  getWikiImage: vi.fn().mockResolvedValue(null),
}));

function makeCountry(over: Partial<Country> = {}): Country {
  return {
    name: "Japan",
    lat: 35,
    lng: 139,
    bestMonths: ["March"],
    budget: "₹1.5L",
    experiences: ["Food"],
    ...over,
  };
}

const two = [
  makeCountry({ name: "Japan", lat: 35, lng: 139 }),
  makeCountry({ name: "Norway", lat: 60, lng: 10 }),
];

describe("MapView", () => {
  beforeEach(() => {
    maps.length = 0;
    markers.length = 0;
    h.state.styleLoaded = true;
    h.state.existingSources = [];
  });
  afterEach(() => cleanup());

  it("creates a maplibre map, adds navigation control, and reports it via onMapReady", () => {
    const onMapReady = vi.fn();
    render(<MapView countries={two} onMapReady={onMapReady} />);

    expect(maps).toHaveLength(1);
    expect(maps[0].opts).toMatchObject({ center: [20, 20], zoom: 1.8 });
    expect(maps[0].addControl).toHaveBeenCalled();
    expect(onMapReady).toHaveBeenCalledWith(maps[0]);
  });

  it("renders one keyboard-focusable marker per country at its coordinates", () => {
    render(<MapView countries={two} />);

    expect(markers).toHaveLength(2);
    expect(markers[0].lngLat).toEqual([139, 35]);
    expect(markers[1].lngLat).toEqual([10, 60]);
    // Marker elements are accessible buttons labelled by destination.
    expect(markers[0].element.getAttribute("aria-label")).toBe("Japan");
    expect(markers[0].element.getAttribute("role")).toBe("button");
    expect(markers[0].element.getAttribute("tabindex")).toBe("0");
  });

  it("flags combo destinations from highlightedNames on the marker element", () => {
    render(<MapView countries={two} highlightedNames={["Norway"]} />);
    expect(markers[0].element.className).not.toContain("travel-marker--combo");
    expect(markers[1].element.className).toContain("travel-marker--combo");
  });

  it("invokes onSelect when a marker is clicked or activated via keyboard", () => {
    const onSelect = vi.fn();
    render(<MapView countries={two} onSelect={onSelect} />);

    fireEvent.click(markers[0].element);
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ name: "Japan" }));

    fireEvent.keyDown(markers[1].element, { key: "Enter" });
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ name: "Norway" }));
  });

  it("shows a hover card on pointer + keyboard focus and hides it on leave/blur", async () => {
    // Stable highlightedNames ref so the marker effect doesn't rebuild markers
    // when the hover state re-renders MapView.
    const stable: string[] = [];
    render(<MapView countries={two} highlightedNames={stable} />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    fireEvent.mouseEnter(markers[0].element);
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByText("Japan")).toBeInTheDocument();

    fireEvent.mouseLeave(markers[0].element);
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());

    // Keyboard parity: focusing a marker previews it too.
    fireEvent.focus(markers[1].element);
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByText("Norway")).toBeInTheDocument();

    fireEvent.blur(markers[1].element);
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  });

  it("tears down the map and clears markers on unmount", () => {
    const onMapReady = vi.fn();
    const { unmount } = render(<MapView countries={two} onMapReady={onMapReady} />);
    const map = maps[0];
    onMapReady.mockClear();

    unmount();

    expect(map.remove).toHaveBeenCalled();
    expect(onMapReady).toHaveBeenCalledWith(null);
    expect(markers.every((m) => m.removed)).toBe(true);
  });

  it("rebuilds markers when the country list changes", () => {
    const { rerender } = render(<MapView countries={two} />);
    expect(markers.filter((m) => !m.removed)).toHaveLength(2);

    rerender(<MapView countries={[makeCountry({ name: "Italy", lat: 41, lng: 12 })]} />);
    // Original two are removed; a fresh marker is added for the new list.
    const live = markers.filter((m) => !m.removed);
    expect(live).toHaveLength(1);
    expect(live[0].element.getAttribute("aria-label")).toBe("Italy");
  });

  it("defers marker build until 'load' and purges leftover cinematic sources when the style isn't ready", () => {
    h.state.styleLoaded = false;
    h.state.existingSources = ["cinematic-route-done", "cinematic-route-current"];

    render(<MapView countries={two} />);
    // Style not loaded yet → no markers, work deferred to the load event.
    expect(markers).toHaveLength(0);

    const map = maps[0];
    map.fireLoad();

    // On load: leftover cinematic layers/sources are torn down and markers appear.
    expect(map.removeLayer).toHaveBeenCalledWith("cinematic-route-done");
    expect(map.removeSource).toHaveBeenCalledWith("cinematic-route-current");
    expect(map.setData).toHaveBeenCalled();
    expect(markers).toHaveLength(2);
  });
});
