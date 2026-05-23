import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import maplibregl from "maplibre-gl";
import type { Country } from "../../types";
import type { TripPlan, DayEntry } from "../../utils/tripPlans";
import { ITINERARY_RULES } from "../../data/itineraryRules";
import { getWikiImage } from "../../utils/wikiImages";
import { type TransportType, TRANSPORT_EMOJI, detectTransport } from "../../utils/transport";
import { usePanelDrag } from "../../hooks/usePanelDrag";

// ─── City stops ───────────────────────────────────────────────────────────────

type CityStop = {
  name: string;
  coords: [number, number];
  days: DayEntry[];
  transportToNext?: { type: TransportType; label: string };
};

function buildCityStops(plan: TripPlan, country: Country): CityStop[] {
  const coordsMap = new Map<string, [number, number]>();
  (country.cities ?? []).forEach((c) => coordsMap.set(c.name, [c.lng, c.lat]));

  const groups: { name: string; days: DayEntry[] }[] = [];
  for (const day of plan.days) {
    const m = day.label.match(/[—\-–]\s*(.+)$/);
    const city = m ? m[1].trim() : "";
    if (!city) continue;
    const last = groups[groups.length - 1];
    if (last && last.name === city) last.days.push(day);
    else groups.push({ name: city, days: [day] });
  }

  const rule = ITINERARY_RULES[country.name];
  return groups
    .filter((g) => coordsMap.has(g.name))
    .map((g, i, arr) => {
      let transportToNext: CityStop["transportToNext"];
      if (i < arr.length - 1 && rule) {
        const next = arr[i + 1].name;
        const conn = rule.connections.find(
          (c) => (c.from === g.name && c.to === next) || (c.from === next && c.to === g.name)
        );
        if (conn) transportToNext = { type: detectTransport(conn.method), label: conn.method.split("(")[0].trim() };
      }
      return { name: g.name, coords: coordsMap.get(g.name)!, days: g.days, transportToNext };
    });
}

// ─── Home departure city coords + names ──────────────────────────────────────

// Coordinates of the primary international departure city for each home country
const HOME_COORDS: Record<string, [number, number]> = {
  "India":          [77.10,   28.56],   // New Delhi (IGI Airport)
  "United States":  [-73.78,  40.64],   // New York (JFK)
  "United Kingdom": [-0.46,   51.47],   // London (Heathrow)
  "Germany":        [8.57,    50.03],   // Frankfurt Airport
  "France":         [2.55,    49.01],   // Paris (CDG)
  "Australia":      [151.18, -33.94],   // Sydney (Kingsford Smith)
  "Canada":         [-79.63,  43.68],   // Toronto (Pearson)
  "Singapore":      [103.99,   1.36],   // Singapore (Changi)
  "UAE":            [55.36,   25.25],   // Dubai (DXB)
  "Japan":          [139.78,  35.55],   // Tokyo (Narita)
  "South Korea":    [126.45,  37.46],   // Seoul (Incheon)
  "Netherlands":    [4.76,    52.31],   // Amsterdam (Schiphol)
  "Italy":          [12.25,   41.80],   // Rome (Fiumicino)
  "Spain":          [-3.57,   40.47],   // Madrid (Barajas)
  "Brazil":         [-46.47, -23.43],   // São Paulo (Guarulhos)
  "South Africa":   [28.25,  -26.13],   // Johannesburg (OR Tambo)
};

// Display name of the departure city (used in status messages)
const HOME_CITY: Record<string, string> = {
  "India":          "New Delhi",
  "United States":  "New York",
  "United Kingdom": "London",
  "Germany":        "Frankfurt",
  "France":         "Paris",
  "Australia":      "Sydney",
  "Canada":         "Toronto",
  "Singapore":      "Singapore",
  "UAE":            "Dubai",
  "Japan":          "Tokyo",
  "South Korea":    "Seoul",
  "Netherlands":    "Amsterdam",
  "Italy":          "Rome",
  "Spain":          "Madrid",
  "Brazil":         "São Paulo",
  "South Africa":   "Johannesburg",
};

// ─── Bezier helper ────────────────────────────────────────────────────────────

function bezierPt(p0: [number, number], p1: [number, number], p2: [number, number], t: number): [number, number] {
  return [
    (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0],
    (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1],
  ];
}

// ─── Map layer IDs ────────────────────────────────────────────────────────────

const SRC_DONE    = "cinematic-route-done";
const SRC_CURRENT = "cinematic-route-current";
const LYR_DONE    = "cinematic-route-done";
const LYR_CURRENT = "cinematic-route-current";

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  plan: TripPlan;
  country: Country;
  homeCountry: string;
  mainMapRef?: RefObject<maplibregl.Map | null>;
  comboCountries?: Array<{ name: string; lat: number; lng: number }>;
  onClose: () => void;
}

type Phase = "intro" | "city" | "done";

export default function ItineraryCinematic({ plan, country, homeCountry, mainMapRef, comboCountries, onClose }: Props) {
  const pausedRef = useRef(false);

  // useState (not useRef) so React re-renders when photos arrive
  const [cityPhotoMap, setCityPhotoMap] = useState<Record<string, string[]>>({});
  const [brokenImgs,  setBrokenImgs]    = useState<Set<string>>(() => new Set());
  const { panelWidth, startPanelDrag }  = usePanelDrag(300, 300);

  const [cityStops]      = useState<CityStop[]>(() => buildCityStops(plan, country));
  const [phase, setPhase]                 = useState<Phase>("intro");
  const [activeCityIdx, setActiveCityIdx] = useState(-1);
  const [activeDayIdx, setActiveDayIdx]   = useState(0);
  const [visibleActs, setVisibleActs]     = useState(0);
  const [showCard, setShowCard]           = useState(false);
  const [slideIdx, setSlideIdx]           = useState(0);
  const [statusMsg, setStatusMsg]         = useState("Preparing journey…");
  const [paused, setPaused]               = useState(false);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // Auto-advance slideshow during city phase
  useEffect(() => {
    if (!showCard || phase !== "city") return;
    const t = setInterval(() => setSlideIdx((s) => s + 1), 3800);
    return () => clearInterval(t);
  }, [showCard, phase, activeCityIdx]);

  // Reset slide index when city changes
  useEffect(() => { setSlideIdx(0); }, [activeCityIdx]);

  // ── Main animation effect ───────────────────────────────────────────────────
  useEffect(() => {
    const mapRaw = mainMapRef?.current;
    if (!mapRaw) { setStatusMsg("Switch to Map view to use Cinematic"); return; }
    const map = mapRaw as maplibregl.Map;

    let cancelled = false;
    const homeCoords = HOME_COORDS[homeCountry] ?? [20, 20];
    const homeCity   = HOME_CITY[homeCountry]   ?? homeCountry;

    // Disable user interaction
    map.dragPan.disable();
    map.scrollZoom.disable();
    map.doubleClickZoom.disable();
    map.touchZoomRotate.disable();
    map.keyboard.disable();

    const origCenter  = map.getCenter();
    const origZoom    = map.getZoom();
    const origBearing = map.getBearing();
    const origPitch   = map.getPitch();

    const allMarkers: maplibregl.Marker[] = [];

    const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));
    async function untilUnpaused() {
      while (pausedRef.current && !cancelled) await sleep(80);
    }

    const flyAndWait = (opts: maplibregl.FlyToOptions): Promise<void> =>
      new Promise((res) => { map.once("moveend", res); map.flyTo({ essential: true, ...opts }); });

    function setRouteDone(coords: [number, number][]) {
      if (!map.getSource(SRC_DONE) || coords.length < 2) return;
      (map.getSource(SRC_DONE) as maplibregl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } }],
      });
    }
    function setRouteCurrent(coords: [number, number][]) {
      if (!map.getSource(SRC_CURRENT)) return;
      (map.getSource(SRC_CURRENT) as maplibregl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: coords.length >= 2
          ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } }]
          : [],
      });
    }

    const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

    function addMapLayers() {
      try {
        if (!map.getSource(SRC_DONE)) {
          map.addSource(SRC_DONE, { type: "geojson", data: EMPTY_FC });
          map.addLayer({ id: LYR_DONE, type: "line", source: SRC_DONE,
            paint: { "line-color": "#94a3b8", "line-width": 2, "line-opacity": 0.6, "line-dasharray": [4, 3] } });
        } else {
          // Clear any stale data left by a previous session that didn't clean up
          (map.getSource(SRC_DONE) as maplibregl.GeoJSONSource).setData(EMPTY_FC);
        }
        if (!map.getSource(SRC_CURRENT)) {
          map.addSource(SRC_CURRENT, { type: "geojson", data: EMPTY_FC });
          map.addLayer({ id: LYR_CURRENT, type: "line", source: SRC_CURRENT,
            paint: { "line-color": "#60a5fa", "line-width": 3, "line-opacity": 1 } });
        } else {
          (map.getSource(SRC_CURRENT) as maplibregl.GeoJSONSource).setData(EMPTY_FC);
        }
      } catch (err) { console.error("[Cinematic] layer error:", err); }
    }
    function removeMapLayers() {
      [
        { lyr: LYR_CURRENT, src: SRC_CURRENT },
        { lyr: LYR_DONE,    src: SRC_DONE    },
      ].forEach(({ lyr, src }) => {
        try {
          // Clear data first so lines vanish visually even if removeSource throws
          if (map.getSource(src)) (map.getSource(src) as maplibregl.GeoJSONSource).setData(EMPTY_FC);
          if (map.getLayer(lyr)) map.removeLayer(lyr);
          if (map.getSource(src)) map.removeSource(src);
        } catch { /* map already removed */ }
      });
    }

    // Draw a bezier arc with a moving emoji marker; returns the arc segment points
    async function drawArc(
      from: [number, number],
      to: [number, number],
      emojiChar: string,
      onTick: (seg: [number, number][]) => void,
    ): Promise<[number, number][]> {
      const mx = (from[0] + to[0]) / 2;
      const my = (from[1] + to[1]) / 2;
      const dist = Math.sqrt((to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2);
      const ctrl: [number, number] = [mx, my + dist * 0.42];

      const txEl = document.createElement("div");
      txEl.style.cssText = "font-size:28px;line-height:1;pointer-events:none;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.65));transform:translate(-50%,-50%);";
      txEl.textContent = emojiChar;
      const txMarker = new maplibregl.Marker({ element: txEl, anchor: "center" }).setLngLat(from).addTo(map);
      allMarkers.push(txMarker);

      const STEPS = 50;
      const seg: [number, number][] = [from];
      for (let s = 1; s <= STEPS; s++) {
        if (cancelled) { txMarker.remove(); return seg; }
        await untilUnpaused();
        const t = s / STEPS;
        const pt = bezierPt(from, ctrl, to, t);
        seg.push(pt);
        txMarker.setLngLat(pt);
        onTick(seg);
        await sleep(30);
      }
      txMarker.remove();
      return seg;
    }

    async function run() {
      setStatusMsg("Preparing your journey…");

      if (!map.isStyleLoaded()) {
        await Promise.race([
          new Promise<void>((res) => { map.once("styledata", res); }),
          new Promise<void>((res) => setTimeout(res, 8000)),
        ]);
      }
      if (cancelled) return;

      addMapLayers();

      // City dot markers
      for (const stop of cityStops) {
        const el = document.createElement("div");
        el.style.cssText = "width:10px;height:10px;background:white;border:2.5px solid #94a3b8;border-radius:50%;transition:all 0.5s ease;box-sizing:border-box;pointer-events:none;";
        allMarkers.push(new maplibregl.Marker({ element: el }).setLngLat(stop.coords).addTo(map));
      }

      // Combo country markers (purple glow dots)
      for (const c of (comboCountries ?? [])) {
        const el = document.createElement("div");
        el.style.cssText = "width:12px;height:12px;background:#a855f7;border:2.5px solid white;border-radius:50%;pointer-events:none;box-shadow:0 0 0 4px rgba(168,85,247,0.3);";
        allMarkers.push(new maplibregl.Marker({ element: el }).setLngLat([c.lng, c.lat]).addTo(map));
      }

      if (cityStops.length === 0) { setStatusMsg("No city data"); return; }

      // ── World overview: fly to mid-globe showing city + combo dots ──────────
      const midLng = (homeCoords[0] + country.lng) / 2;
      const midLat = (homeCoords[1] + country.lat) / 2;
      setStatusMsg(`${homeCity} → ${country.name}`);
      await flyAndWait({ center: [midLng, midLat], zoom: 1.8, duration: 1800 });
      if (cancelled) return;
      await sleep(300);

      // Show trip summary while photos are fetched
      const comboLine = comboCountries?.length
        ? ` · also pairs with ${comboCountries.map((c) => c.name).join(", ")}`
        : "";
      setStatusMsg(`${plan.duration} · ${plan.costPerPerson} pp${comboLine}`);

      // Pre-fetch city images during overview hold (parallel for speed)
      const rule = ITINERARY_RULES[country.name];
      const cityImgKeys = rule?.cityImages ?? {};
      const fetchedPhotos: Record<string, string[]> = {};

      const photoPromises = Object.entries(cityImgKeys).map(async ([cityName, articles]) => {
        const results = await Promise.allSettled(
          articles.map((article) => getWikiImage(article)),
        );
        const valid = results
          .filter((r): r is PromiseFulfilledResult<string | null> => r.status === "fulfilled")
          .map((r) => r.value)
          .filter((v): v is string => !!v);
        if (valid.length > 0) fetchedPhotos[cityName] = valid;
      });
      await Promise.allSettled(photoPromises);
      if (cancelled) return;
      setCityPhotoMap(fetchedPhotos);
      await sleep(400);
      if (cancelled) return;

      // ── Fly into home country ──────────────────────────────────────────────
      setStatusMsg(`Starting in ${homeCity}…`);
      await flyAndWait({ center: homeCoords, zoom: 4, duration: 1600 });
      if (cancelled) return;
      await sleep(300);

      // ── Departure arc: home → first city ──────────────────────────────────
      const completedCoords: [number, number][] = [homeCoords];
      const firstStop = cityStops[0];

      setStatusMsg(`✈️  ${homeCity} → ${firstStop.name}`);
      map.flyTo({
        center: [(homeCoords[0] + firstStop.coords[0]) / 2, (homeCoords[1] + firstStop.coords[1]) / 2],
        zoom: 1.8,
        duration: 1200,
        essential: true,
      });
      await sleep(800);
      if (cancelled) return;

      const departureSeg = await drawArc(homeCoords, firstStop.coords, "✈️", (seg) => setRouteCurrent(seg));
      if (cancelled) return;
      completedCoords.push(...departureSeg.slice(1));
      setRouteDone(completedCoords);
      setRouteCurrent([]);
      await sleep(400);

      // ── City loop ──────────────────────────────────────────────────────────
      for (let i = 0; i < cityStops.length; i++) {
        if (cancelled) return;
        await untilUnpaused();

        const stop = cityStops[i];

        // Activate city dot
        const dotEl = allMarkers[i]?.getElement();
        if (dotEl) {
          dotEl.style.cssText = "width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.35);transition:all 0.5s ease;box-sizing:border-box;pointer-events:none;";
        }

        // Transit between cities (i > 0)
        if (i > 0) {
          const from   = cityStops[i - 1].coords;
          const to     = stop.coords;
          const ttype  = cityStops[i - 1].transportToNext?.type ?? "drive";
          const isFlight = ttype === "flight";

          setStatusMsg(`${TRANSPORT_EMOJI[ttype]}  ${cityStops[i - 1].name} → ${stop.name}`);

          if (isFlight) {
            // Zoom out to see both cities for flights
            map.flyTo({
              center: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2],
              zoom: 4.5, duration: 1000, essential: true,
            });
            await sleep(800);
            if (cancelled) return;
          }

          const mx   = (from[0] + to[0]) / 2;
          const my   = (from[1] + to[1]) / 2;
          const dist = Math.sqrt((to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2);
          const ctrl: [number, number] = isFlight ? [mx, my + dist * 0.42] : [mx, my];

          const txEl = document.createElement("div");
          txEl.style.cssText = "font-size:28px;line-height:1;pointer-events:none;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.65));transform:translate(-50%,-50%);";
          txEl.textContent = TRANSPORT_EMOJI[ttype];
          const txMarker = new maplibregl.Marker({ element: txEl, anchor: "center" }).setLngLat(from).addTo(map);
          allMarkers.push(txMarker);

          const STEPS = 40;
          const seg: [number, number][] = [from];
          for (let s = 1; s <= STEPS; s++) {
            if (cancelled) { txMarker.remove(); return; }
            await untilUnpaused();
            const t = s / STEPS;
            const pt: [number, number] = isFlight
              ? bezierPt(from, ctrl, to, t)
              : [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
            seg.push(pt);
            txMarker.setLngLat(pt);
            setRouteCurrent(seg);
            await sleep(35);
          }
          txMarker.remove();
          completedCoords.push(...seg.slice(1));
          setRouteDone(completedCoords);
          setRouteCurrent([]);
          await sleep(400);
        }

        if (cancelled) return;

        // Fly to city
        setStatusMsg(`Arriving in ${stop.name}…`);
        await flyAndWait({ center: stop.coords, zoom: 9.5, duration: 2200 });
        if (cancelled) return;

        setActiveCityIdx(i);
        setActiveDayIdx(0);
        setPhase("city");
        await sleep(300);
        setShowCard(true);

        // Day loop
        for (let di = 0; di < stop.days.length; di++) {
          if (cancelled) return;
          await untilUnpaused();

          setActiveDayIdx(di);
          setVisibleActs(0);
          setStatusMsg(`${stop.name} · Day ${di + 1}`);
          await sleep(500);

          const day = stop.days[di];
          for (let a = 1; a <= day.activities.length; a++) {
            if (cancelled) return;
            await untilUnpaused();
            setVisibleActs(a);
            await sleep(520);
          }

          // Hold after all activities shown
          const holdEnd = Date.now() + 2200;
          while (Date.now() < holdEnd) {
            if (cancelled) return;
            await untilUnpaused();
            await sleep(100);
          }
        }

        // Hide card before leaving
        setShowCard(false);
        await sleep(400);
        if (cancelled) return;

        // Zoom out for transit (if more cities remain)
        if (i < cityStops.length - 1) {
          const next = cityStops[i + 1].coords;
          map.flyTo({
            center: [(stop.coords[0] + next[0]) / 2, (stop.coords[1] + next[1]) / 2],
            zoom: 5, duration: 1300, essential: true,
          });
          await sleep(1000);
          if (cancelled) return;
        }
      }

      // ── Return arc: last city → home ────────────────────────────────────────
      const lastStop = cityStops[cityStops.length - 1];
      setStatusMsg(`✈️  ${lastStop.name} → ${homeCity}`);

      // Zoom to world view for the return arc
      map.flyTo({
        center: [(lastStop.coords[0] + homeCoords[0]) / 2, (lastStop.coords[1] + homeCoords[1]) / 2],
        zoom: 1.8, duration: 1200, essential: true,
      });
      await sleep(800);
      if (cancelled) return;

      const returnSeg = await drawArc(lastStop.coords, homeCoords, "✈️", (seg) => setRouteCurrent(seg));
      if (cancelled) return;
      completedCoords.push(...returnSeg.slice(1));
      setRouteDone(completedCoords);
      setRouteCurrent([]);
      await sleep(400);

      // Zoom into home country
      setStatusMsg(`Welcome back to ${homeCity}!`);
      await flyAndWait({ center: homeCoords, zoom: 5, duration: 2000 });
      if (cancelled) return;
      await sleep(500);

      setStatusMsg("Trip complete!");
      setPhase("done");
    }

    run().catch((err) => {
      if (!cancelled) console.error("[Cinematic] Error:", err);
    });

    return () => {
      cancelled = true;
      allMarkers.forEach((m) => m.remove());
      removeMapLayers();
      map.dragPan.enable();
      map.scrollZoom.enable();
      map.doubleClickZoom.enable();
      map.touchZoomRotate.enable();
      map.keyboard.enable();
      map.flyTo({ center: origCenter, zoom: origZoom, bearing: origBearing, pitch: origPitch, duration: 800, essential: true });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeStop  = activeCityIdx >= 0 ? cityStops[activeCityIdx] : null;
  const activeDay   = activeStop?.days[activeDayIdx] ?? null;
  const cityPhotos  = (cityPhotoMap[activeStop?.name ?? ""] ?? []).filter((u) => !brokenImgs.has(u));
  const mapAvailable = !!mainMapRef?.current;

  return createPortal(
    <div className="fixed inset-0 z-[200]" style={{ fontFamily: "inherit" }}>

      {/* ── Left area — transparent, main map shows through ─────────────────── */}
      <div className="absolute top-0 left-0 bottom-0" style={{ right: panelWidth }}>

        {/* Subtle dim during transit/intro */}
        <div
          className="absolute inset-0 bg-black pointer-events-none"
          style={{ opacity: !showCard ? 0.3 : 0.1, transition: "opacity 0.8s ease" }}
        />

        {/* ── Photo card — appears during city phase ───────────────────────── */}
        {phase === "city" && (
          <div
            className="absolute rounded-2xl overflow-hidden shadow-2xl"
            style={{
              top: "5%", left: "4%", right: "4%", bottom: "38%",
              opacity: showCard ? 1 : 0,
              transition: "opacity 0.9s ease",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            {/* Slideshow layers — fade between images */}
            {cityPhotos.map((url, i) => (
              <div
                key={url}
                className="absolute inset-0"
                style={{
                  opacity: i === slideIdx % Math.max(1, cityPhotos.length) ? 1 : 0,
                  transition: "opacity 1.2s ease",
                }}
              >
                <img
                  src={url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={() => setBrokenImgs((s) => new Set(s).add(url))}
                />
              </div>
            ))}

            {/* Fallback gradient when no photos */}
            {cityPhotos.length === 0 && (
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0f172a 100%)" }}
              />
            )}

            {/* Bottom gradient + caption */}
            <div className="absolute bottom-0 left-0 right-0 px-5 pt-16 pb-4 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none">
              <p className="text-white font-black text-2xl leading-tight drop-shadow">
                {activeStop?.name}
              </p>
              {activeDay?.theme && (
                <p className="text-white/70 text-sm mt-0.5 font-medium drop-shadow">
                  {activeDay.theme}
                </p>
              )}
            </div>

            {/* Day progress indicator (top-left) */}
            {activeStop && activeStop.days.length > 1 && (
              <div className="absolute top-3 left-4 flex gap-1.5 pointer-events-none">
                {activeStop.days.map((_, di) => (
                  <div
                    key={di}
                    className="rounded-full transition-all duration-500"
                    style={{
                      width: di === activeDayIdx ? "20px" : "6px",
                      height: "6px",
                      background: di === activeDayIdx ? "white" : di < activeDayIdx ? "#60a5fa" : "rgba(255,255,255,0.3)",
                    }}
                  />
                ))}
              </div>
            )}

            {/* Slide dots (top-right) */}
            {cityPhotos.length > 1 && (
              <div className="absolute top-3.5 right-4 flex gap-1 pointer-events-none">
                {cityPhotos.map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full transition-colors"
                    style={{ background: i === slideIdx % cityPhotos.length ? "white" : "rgba(255,255,255,0.35)" }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Status pill (transit / intro phases) */}
        {!showCard && (
          <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
            <div className="bg-black/70 backdrop-blur-sm text-white text-sm font-semibold px-5 py-2.5 rounded-full max-w-sm text-center shadow-lg">
              {mapAvailable ? statusMsg : "Switch to Map view to use Cinematic"}
            </div>
          </div>
        )}

        {/* Small status chip during city phase (shows on map below card) */}
        {showCard && (
          <div className="absolute bottom-4 left-4 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm text-white/80 text-xs font-semibold px-3 py-1.5 rounded-full">
              {statusMsg}
            </div>
          </div>
        )}
      </div>

      {/* ── Drag handle — sits at the boundary, z above everything ─────────── */}
      <div
        className="absolute top-0 bottom-0 z-[210] cursor-col-resize select-none group"
        style={{ right: panelWidth - 6, width: 12 }}
        onPointerDown={startPanelDrag}
      >
        <div className="absolute inset-y-0 left-[5px] w-[2px] bg-white/10 group-hover:bg-blue-400/50 transition-colors" />
        {/* Grip dots in the vertical centre */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-[5px]">
          {[0,1,2,3].map((i) => (
            <div key={i} className="w-[3px] h-[3px] rounded-full bg-white/30 group-hover:bg-blue-400/70 transition-colors" />
          ))}
        </div>
      </div>

      {/* ── Right panel ──────────────────────────────────────────────────────── */}
      <div
        className="absolute top-0 right-0 bottom-0 bg-gray-950 text-white flex flex-col"
        style={{ width: panelWidth }}
      >

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Cinematic Journey</p>
              <h2 className="text-xl font-black">{country.name}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{plan.duration} · {plan.costPerPerson} pp</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white hover:bg-white/10 p-1.5 rounded-xl transition-colors text-base leading-none shrink-0"
            >✕</button>
          </div>

          {/* Route progress trail */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mr-1">{HOME_CITY[homeCountry] ?? homeCountry}</span>
            <span className="text-[10px] text-gray-600">✈</span>
            {cityStops.map((stop, i) => (
              <span key={stop.name} className="flex items-center gap-1">
                <span
                  title={stop.name}
                  className={`inline-block rounded-full transition-all duration-500 ${
                    i < activeCityIdx   ? "w-2 h-2 bg-blue-400" :
                    i === activeCityIdx ? "w-3 h-3 bg-white ring-2 ring-blue-400 ring-offset-1 ring-offset-gray-950" :
                                         "w-2 h-2 bg-white/15"
                  }`}
                />
                {i < cityStops.length - 1 && stop.transportToNext && (
                  <span className="text-[10px] opacity-30">{TRANSPORT_EMOJI[stop.transportToNext.type]}</span>
                )}
              </span>
            ))}
            <span className="text-[10px] text-gray-600 ml-0.5">✈</span>
            <span className="text-[10px] font-bold text-gray-500 ml-0.5">{HOME_CITY[homeCountry] ?? homeCountry}</span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {phase === "intro" && (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center pb-8">
              <span className="text-6xl">🌍</span>
              <div>
                <p className="text-base font-bold text-white">{HOME_CITY[homeCountry] ?? homeCountry}</p>
                <p className="text-[11px] text-gray-600 -mt-0.5">{homeCountry}</p>
                <p className="text-gray-500 text-sm mt-2">✈</p>
                <p className="text-base font-bold text-white mt-2">{country.name}</p>
              </div>
              <p className="text-[11px] text-gray-400">{plan.duration} · {plan.costPerPerson} pp</p>
              {comboCountries && comboCountries.length > 0 && (
                <div className="mt-1">
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1.5">Also pairs with</p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {comboCountries.map((c) => (
                      <span key={c.name} className="text-[10px] font-semibold text-purple-400 bg-purple-950/60 border border-purple-800/50 px-2 py-0.5 rounded-full">
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-600 italic mt-1">{statusMsg}</p>
              {!mapAvailable && (
                <p className="text-xs text-amber-400 mt-2">Please switch to Map view first</p>
              )}
            </div>
          )}

          {phase === "city" && activeStop && activeDay && (
            <div key={`${activeCityIdx}-${activeDayIdx}`} className="itinerary-card">

              {/* City + stop info */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">
                  Stop {activeCityIdx + 1} of {cityStops.length}
                </span>
                {activeStop.days.length > 1 && (
                  <span className="text-[9px] text-gray-600">
                    · Day {activeDayIdx + 1}/{activeStop.days.length}
                  </span>
                )}
              </div>

              <h3 className="text-2xl font-black leading-tight">{activeStop.name}</h3>
              <div className="flex items-center gap-2 flex-wrap mt-1 mb-4">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  {activeDay.label.split("—")[0].trim()}
                </p>
                {activeDay.theme && (
                  <span className="text-[9px] font-semibold text-blue-300 bg-blue-950 px-2 py-0.5 rounded-full">
                    {activeDay.theme}
                  </span>
                )}
              </div>

              {/* Next transport hint */}
              {activeStop.transportToNext && (
                <p className="text-[10px] text-gray-600 mb-3">
                  {TRANSPORT_EMOJI[activeStop.transportToNext.type]} Next: {activeStop.transportToNext.label}
                </p>
              )}

              {/* Activities */}
              <ul className="space-y-3">
                {activeDay.activities.slice(0, visibleActs).map((a, ai) => {
                  const [main, ...rest] = a.split(" (");
                  const detail = rest.join(" (");
                  return (
                    <li key={ai} className="itinerary-day flex gap-2 leading-snug" style={{ animationDelay: "0ms" }}>
                      <span className="text-blue-400 shrink-0 mt-0.5 text-sm">›</span>
                      <span className="text-xs text-gray-300">
                        {main}
                        {detail && <span className="text-gray-500 ml-1">({detail}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* Hotels */}
              {visibleActs >= activeDay.activities.length && activeDay.hotels && activeDay.hotels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-white/10 itinerary-day" style={{ animationDelay: "0ms" }}>
                  {activeDay.hotels.map((h) => (
                    <span key={h} className="text-[10px] text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                      🏨 {h}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {phase === "done" && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center pb-8">
              <span className="text-5xl mb-2">🎉</span>
              <h3 className="text-lg font-black">Back in {HOME_CITY[homeCountry] ?? homeCountry}!</h3>
              <p className="text-xs text-gray-400">{plan.duration} · {plan.costPerPerson} pp</p>
              <div className="mt-3 text-[11px] text-gray-500 leading-relaxed text-left bg-white/5 rounded-xl px-4 py-3">
                {plan.note}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between shrink-0">
          <button
            onClick={() => setPaused((p) => !p)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold transition-colors"
          >
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold transition-colors text-gray-400 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
