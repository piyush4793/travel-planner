import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import maplibregl from "maplibre-gl";
import CinematicOverview from "./cinematic/CinematicOverview";
import CinematicControls from "./cinematic/CinematicControls";
import CinematicDayPanel from "./cinematic/CinematicDayPanel";
import CinematicIntro from "./cinematic/CinematicIntro";
import CinematicDone from "./cinematic/CinematicDone";
import CinematicPhotoCard from "./cinematic/CinematicPhotoCard";
import CinematicHeader from "./cinematic/CinematicHeader";
import { planCostBasisIcon } from "../../core/utils/tripPlans";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import { getWikiImage } from "../../utils/wikiImages";
import { type TransportType, TRANSPORT_EMOJI } from "../../core/utils/transport";
import { usePanelDrag } from "../../hooks/usePanelDrag";
import {
  type CityStop,
  type CinematicRoute,
  easeInOut,
  generateRoadPath,
  generateRailPath,
  roadPt,
  rotateIconToHeading,
  createTransportEl,
  removeTransportMarker,
  bezierPt,
  cleanJumpOptions,
  rafAnimate,
  calcBearing,
  SRC_DONE,
  SRC_CURRENT,
  LYR_DONE,
  LYR_CURRENT,
  LYR_TRACKS,
  LYR_TRACKS_TIES,
} from "./cinematic/engine";

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  route: CinematicRoute;
  mainMapRef?: RefObject<maplibregl.Map | null>;
  onClose: () => void;
}

type Phase = "intro" | "city" | "done";

export default function ItineraryCinematic({ route, mainMapRef, onClose }: Props) {
  const { title, plan, origin, comboCountries } = route;

  // Escape closes the overlay and focus returns to the trigger on unmount
  // (mandatory overlay a11y). Registered before any conditional return so it
  // guards both the reduced-motion summary and the full fly-through render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prevFocus?.focus?.();
    };
  }, []);

  // Reduced-motion: show static itinerary summary instead of fly-through
  const prefersReducedMotion = typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    return <CinematicOverview title={title} stops={route.stops} onClose={onClose} />;
  }

  const pausedRef = useRef(false);
  const speedRef = useRef(1);
  const skipActiveRef = useRef(false);
  // Index of the last-arrived city stop (drives prev/next), and the fast-forward
  // target used when replaying from the start to reach an earlier stop.
  const currentStopRef = useRef(-1);
  const jumpToRef = useRef<number | null>(null);
  // Preserves the true pre-cinematic camera across replays so close always restores it.
  const savedViewRef = useRef<{ center: maplibregl.LngLat; zoom: number; bearing: number; pitch: number } | null>(null);

  // useState (not useRef) so React re-renders when photos arrive
  const [cityPhotoMap, setCityPhotoMap] = useState<Record<string, string[]>>({});
  const [brokenImgs,  setBrokenImgs]    = useState<Set<string>>(() => new Set());
  const { panelWidth, startPanelDrag }  = usePanelDrag(300, 300);
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const ctrlBtnSize = isMobile ? "w-11 h-11" : "w-9 h-9";

  const [cityStops]      = useState<CityStop[]>(() => route.stops);
  const [phase, setPhase]                 = useState<Phase>("intro");
  const [activeCityIdx, setActiveCityIdx] = useState(-1);
  const [activeDayIdx, setActiveDayIdx]   = useState(0);
  const [visibleActs, setVisibleActs]     = useState(0);
  const [showCard, setShowCard]           = useState(false);
  const [slideIdx, setSlideIdx]           = useState(0);
  const [statusMsg, setStatusMsg]         = useState("Preparing journey…");
  const [paused, setPaused]               = useState(false);
  const [speed, setSpeed]                 = useState(1);
  const [runId, setRunId]                 = useState(0);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  const cycleSpeed = () => setSpeed((s) => (s >= 2 ? 1 : s === 1 ? 1.5 : 2));
  // Fast-forward every segment until the next city stop is reached (auto-cleared there).
  const skipStep = () => {
    jumpToRef.current = null;
    skipActiveRef.current = true;
    setPaused(false);
  };
  // Replay from the start, fast-forwarding to the previous stop (forward-only engine).
  // Decrement from the pending target when a jump is already in flight so rapid
  // clicks step back deterministically.
  const prevStep = () => {
    const base = jumpToRef.current != null ? jumpToRef.current : currentStopRef.current;
    const target = Math.max(0, base - 1);
    jumpToRef.current = target;
    skipActiveRef.current = true;
    setPaused(false);
    setRunId((r) => r + 1);
  };

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
    if (!mapRaw) { setStatusMsg("⚠ Switch to Map view to start the cinematic journey"); return; }
    const map = mapRaw as maplibregl.Map;

    let cancelled = false;
    // Origin is optional: international trips depart/return via a home arc;
    // domestic (in-country) routes pass `origin: null` and skip those arcs.
    const homeCoords = origin?.coords ?? null;
    const homeCity   = origin?.city ?? "";

    // Disable user interaction
    map.dragPan.disable();
    map.scrollZoom.disable();
    map.doubleClickZoom.disable();
    map.touchZoomRotate.disable();
    map.keyboard.disable();

    const savedView = savedViewRef.current ?? {
      center: map.getCenter(),
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
    };
    savedViewRef.current = savedView;
    const { center: origCenter, zoom: origZoom, bearing: origBearing, pitch: origPitch } = savedView;

    const allMarkers: maplibregl.Marker[] = [];

    const sleep = (ms: number) => new Promise<void>((res) => {
      if (skipActiveRef.current) { res(); return; }
      const target = ms / speedRef.current;
      const t0 = Date.now();
      const poll = () => {
        if (cancelled || skipActiveRef.current || Date.now() - t0 >= target) { res(); return; }
        setTimeout(poll, 24);
      };
      poll();
    });
    async function untilUnpaused() {
      while (pausedRef.current && !cancelled) await sleep(80);
    }

    const jumpTo = (opts: maplibregl.FlyToOptions): void => {
      map.jumpTo(cleanJumpOptions(opts));
    };

    const flyAndWait = (opts: maplibregl.FlyToOptions): Promise<void> =>
      new Promise((res) => {
        if (skipActiveRef.current) { jumpTo(opts); res(); return; }
        map.once("moveend", res);
        map.flyTo({ essential: true, ...opts, duration: (opts.duration ?? 0) / speedRef.current });
      });

    // Speed-scaled flyTo for the fire-and-forget segments (paired with a matching sleep)
    const fly = (opts: maplibregl.FlyToOptions): void => {
      if (skipActiveRef.current) { jumpTo(opts); return; }
      map.flyTo({ essential: true, ...opts, duration: (opts.duration ?? 0) / speedRef.current });
    };

    // Wait for map tiles to finish loading (caps at timeoutMs to avoid infinite hang)
    function waitForIdle(timeoutMs = 2500): Promise<void> {
      return new Promise((res) => {
        if (skipActiveRef.current || map.areTilesLoaded()) { res(); return; }
        const timer = setTimeout(res, timeoutMs);
        map.once("idle", () => { clearTimeout(timer); res(); });
      });
    }

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
            paint: { "line-color": "#94a3b8", "line-width": 2.5, "line-opacity": 0.45, "line-dasharray": [4, 3] } });
        } else {
          (map.getSource(SRC_DONE) as maplibregl.GeoJSONSource).setData(EMPTY_FC);
        }
        if (!map.getSource(SRC_CURRENT)) {
          map.addSource(SRC_CURRENT, { type: "geojson", data: EMPTY_FC });
          // Outer halo (wide, soft)
          map.addLayer({ id: LYR_CURRENT + "-glow", type: "line", source: SRC_CURRENT,
            paint: { "line-color": "#3b82f6", "line-width": 14, "line-opacity": 0.1, "line-blur": 6 } });
          // Inner glow (tighter)
          map.addLayer({ id: LYR_CURRENT + "-glow2", type: "line", source: SRC_CURRENT,
            paint: { "line-color": "#60a5fa", "line-width": 6, "line-opacity": 0.25, "line-blur": 2 } });
          // Core route line
          map.addLayer({ id: LYR_CURRENT, type: "line", source: SRC_CURRENT,
            paint: { "line-color": "#93c5fd", "line-width": 3, "line-opacity": 1 } });
          // Railroad track layers (initially hidden) — dark steel rails + brown sleeper ties
          map.addLayer({ id: LYR_TRACKS, type: "line", source: SRC_CURRENT,
            paint: { "line-color": "#44403c", "line-width": 6, "line-opacity": 0, "line-gap-width": 2 } });
          map.addLayer({ id: LYR_TRACKS_TIES, type: "line", source: SRC_CURRENT,
            paint: { "line-color": "#78716c", "line-width": 12, "line-opacity": 0, "line-dasharray": [0.2, 1.5] } });
        } else {
          (map.getSource(SRC_CURRENT) as maplibregl.GeoJSONSource).setData(EMPTY_FC);
        }
      } catch (err) { console.error("[Cinematic] layer error:", err); }
    }

    // Switch route line styling based on transport type
    function styleRouteForTransport(ttype: TransportType) {
      try {
        if (ttype === "flight") {
          // Plane: thicker blue contrail-like line
          map.setPaintProperty(LYR_CURRENT + "-glow", "line-width", 20);
          map.setPaintProperty(LYR_CURRENT + "-glow", "line-opacity", 0.15);
          map.setPaintProperty(LYR_CURRENT + "-glow2", "line-width", 8);
          map.setPaintProperty(LYR_CURRENT + "-glow2", "line-opacity", 0.3);
          map.setPaintProperty(LYR_CURRENT, "line-width", 4);
          map.setPaintProperty(LYR_CURRENT, "line-color", "#93c5fd");
          map.setPaintProperty(LYR_CURRENT, "line-dasharray", null);
          map.setPaintProperty(LYR_TRACKS, "line-opacity", 0);
          map.setPaintProperty(LYR_TRACKS_TIES, "line-opacity", 0);
        } else if (ttype === "train") {
          // Train: dual rail lines + sleeper ties + warm underglow
          map.setPaintProperty(LYR_CURRENT + "-glow", "line-width", 16);
          map.setPaintProperty(LYR_CURRENT + "-glow", "line-opacity", 0.12);
          map.setPaintProperty(LYR_CURRENT + "-glow", "line-color", "#f59e0b");
          map.setPaintProperty(LYR_CURRENT + "-glow2", "line-opacity", 0);
          map.setPaintProperty(LYR_CURRENT, "line-width", 2);
          map.setPaintProperty(LYR_CURRENT, "line-color", "#78716c");
          map.setPaintProperty(LYR_CURRENT, "line-dasharray", null);
          map.setPaintProperty(LYR_TRACKS, "line-opacity", 0.8);
          map.setPaintProperty(LYR_TRACKS_TIES, "line-opacity", 0.6);
        } else if (ttype === "drive") {
          // Car: warm amber/orange solid line — road feel
          map.setPaintProperty(LYR_CURRENT + "-glow", "line-width", 14);
          map.setPaintProperty(LYR_CURRENT + "-glow", "line-opacity", 0.12);
          map.setPaintProperty(LYR_CURRENT + "-glow", "line-color", "#f59e0b");
          map.setPaintProperty(LYR_CURRENT + "-glow2", "line-width", 6);
          map.setPaintProperty(LYR_CURRENT + "-glow2", "line-opacity", 0.2);
          map.setPaintProperty(LYR_CURRENT + "-glow2", "line-color", "#fbbf24");
          map.setPaintProperty(LYR_CURRENT, "line-width", 3);
          map.setPaintProperty(LYR_CURRENT, "line-color", "#f59e0b");
          map.setPaintProperty(LYR_CURRENT, "line-dasharray", null);
          map.setPaintProperty(LYR_TRACKS, "line-opacity", 0);
          map.setPaintProperty(LYR_TRACKS_TIES, "line-opacity", 0);
        } else if (ttype === "bus") {
          // Bus: thick bright blue solid line (mult.dev style)
          map.setPaintProperty(LYR_CURRENT + "-glow", "line-width", 18);
          map.setPaintProperty(LYR_CURRENT + "-glow", "line-opacity", 0.15);
          map.setPaintProperty(LYR_CURRENT + "-glow", "line-color", "#3b82f6");
          map.setPaintProperty(LYR_CURRENT + "-glow2", "line-width", 8);
          map.setPaintProperty(LYR_CURRENT + "-glow2", "line-opacity", 0.3);
          map.setPaintProperty(LYR_CURRENT + "-glow2", "line-color", "#60a5fa");
          map.setPaintProperty(LYR_CURRENT, "line-width", 4.5);
          map.setPaintProperty(LYR_CURRENT, "line-color", "#60a5fa");
          map.setPaintProperty(LYR_CURRENT, "line-dasharray", null);
          map.setPaintProperty(LYR_TRACKS, "line-opacity", 0);
          map.setPaintProperty(LYR_TRACKS_TIES, "line-opacity", 0);
        } else {
          // Ferry/Cable car: subtle grey-blue dashed line
          map.setPaintProperty(LYR_CURRENT + "-glow", "line-width", 10);
          map.setPaintProperty(LYR_CURRENT + "-glow", "line-opacity", 0.08);
          map.setPaintProperty(LYR_CURRENT + "-glow", "line-color", "#64748b");
          map.setPaintProperty(LYR_CURRENT + "-glow2", "line-width", 5);
          map.setPaintProperty(LYR_CURRENT + "-glow2", "line-opacity", 0.15);
          map.setPaintProperty(LYR_CURRENT + "-glow2", "line-color", "#94a3b8");
          map.setPaintProperty(LYR_CURRENT, "line-width", 2.5);
          map.setPaintProperty(LYR_CURRENT, "line-color", "#94a3b8");
          map.setPaintProperty(LYR_CURRENT, "line-dasharray", [4, 3]);
          map.setPaintProperty(LYR_TRACKS, "line-opacity", 0);
          map.setPaintProperty(LYR_TRACKS_TIES, "line-opacity", 0);
        }
      } catch { /* layers may not exist yet */ }
    }

    // Reset route styling to default (for departure/return arcs)
    function resetRouteStyle() {
      try {
        map.setPaintProperty(LYR_CURRENT + "-glow", "line-width", 20);
        map.setPaintProperty(LYR_CURRENT + "-glow", "line-opacity", 0.15);
        map.setPaintProperty(LYR_CURRENT + "-glow", "line-color", "#3b82f6");
        map.setPaintProperty(LYR_CURRENT + "-glow2", "line-width", 8);
        map.setPaintProperty(LYR_CURRENT + "-glow2", "line-opacity", 0.3);
        map.setPaintProperty(LYR_CURRENT + "-glow2", "line-color", "#60a5fa");
        map.setPaintProperty(LYR_CURRENT, "line-width", 4);
        map.setPaintProperty(LYR_CURRENT, "line-color", "#93c5fd");
        map.setPaintProperty(LYR_CURRENT, "line-dasharray", null);
        map.setPaintProperty(LYR_TRACKS, "line-opacity", 0);
        map.setPaintProperty(LYR_TRACKS_TIES, "line-opacity", 0);
      } catch { /* layers may not exist yet */ }
    }

    function removeMapLayers() {
      [LYR_CURRENT, LYR_CURRENT + "-glow2", LYR_CURRENT + "-glow", LYR_TRACKS_TIES, LYR_TRACKS, LYR_DONE].forEach((lyr) => {
        try { if (map.getLayer(lyr)) map.removeLayer(lyr); } catch { /* already removed */ }
      });
      [SRC_CURRENT, SRC_DONE].forEach((src) => {
        try {
          if (map.getSource(src)) (map.getSource(src) as maplibregl.GeoJSONSource).setData(EMPTY_FC);
          if (map.getSource(src)) map.removeSource(src);
        } catch { /* already removed */ }
      });
    }

    async function run() {
      setStatusMsg("Preparing your journey…");
      // Reset visible state so replays (prev/jump) start from a clean intro.
      setPhase("intro");
      setShowCard(false);
      setActiveCityIdx(-1);
      setActiveDayIdx(0);
      setVisibleActs(0);

      if (!map.isStyleLoaded()) {
        await Promise.race([
          new Promise<void>((res) => { map.once("styledata", res); }),
          new Promise<void>((res) => setTimeout(res, 8000)),
        ]);
      }
      if (cancelled) return;

      setStatusMsg("🗺️ Plotting route…");
      addMapLayers();

      // City dot markers — start hidden, revealed progressively during animation
      for (const stop of cityStops) {
        const el = document.createElement("div");
        el.style.cssText = "width:10px;height:10px;background:white;border:2.5px solid #94a3b8;border-radius:50%;transition:transform 0.6s ease, opacity 0.6s ease;box-sizing:border-box;pointer-events:none;opacity:0;transform:scale(0);";
        allMarkers.push(new maplibregl.Marker({ element: el }).setLngLat(stop.coords).addTo(map));
      }

      // Manage which city dots are visible to avoid clutter when zoomed in
      function showCityDots(activeIdx: number, nextIdx: number) {
        for (let d = 0; d < cityStops.length; d++) {
          const dotEl = allMarkers[d]?.getElement();
          if (!dotEl) continue;
          if (d === activeIdx) {
            dotEl.style.opacity = "1";
            dotEl.style.transform = "scale(1)";
          } else if (d === nextIdx) {
            dotEl.style.opacity = "0.7";
            dotEl.style.transform = "scale(0.85)";
          } else if (d < activeIdx) {
            // Visited — small and dimmed
            dotEl.style.opacity = "0.35";
            dotEl.style.transform = "scale(0.7)";
          } else {
            // Future — hidden
            dotEl.style.opacity = "0";
            dotEl.style.transform = "scale(0)";
          }
        }
      }

      // Combo country markers (purple glow dots)
      for (const c of (comboCountries ?? [])) {
        const el = document.createElement("div");
        el.style.cssText = "width:12px;height:12px;background:#a855f7;border:2.5px solid white;border-radius:50%;pointer-events:none;box-shadow:0 0 0 4px rgba(168,85,247,0.3);";
        allMarkers.push(new maplibregl.Marker({ element: el }).setLngLat([c.lng, c.lat]).addTo(map));
      }

      if (cityStops.length === 0) { setStatusMsg("No city data"); return; }

      // ── World overview: fly to mid-globe showing city + combo dots ──────────
      setStatusMsg(origin ? `${homeCity} → ${title}` : title);
      await flyAndWait({ center: route.overviewCenter, zoom: 1.8, duration: 1800 });
      if (cancelled) return;
      await waitForIdle();
      await sleep(500);

      // Show trip summary while photos are fetched
      const comboLine = comboCountries?.length
        ? ` · also pairs with ${comboCountries.map((c) => c.name).join(", ")}`
        : "";
      setStatusMsg(`${plan.duration} · ${plan.costPerPerson} ${planCostBasisIcon(plan)}${comboLine}`);

      // Pre-fetch city images during overview hold (parallel, with timeout).
      // Merged across every unit on the route, so multi-country stops get photos too.
      const cityImgKeys = route.cityImages;
      const fetchedPhotos: Record<string, string[]> = {};

      setStatusMsg("📸 Loading city photos…");
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
      // Cap photo fetch at 5s to prevent stalling the animation
      await Promise.race([
        Promise.allSettled(photoPromises),
        sleep(5000),
      ]);
      if (cancelled) return;
      setCityPhotoMap((prev) => ({ ...prev, ...fetchedPhotos }));

      setStatusMsg(`${plan.duration} · ${plan.costPerPerson} ${planCostBasisIcon(plan)}${comboLine}`);
      await sleep(400);
      if (cancelled) return;

      const firstStop = cityStops[0];
      // Route line accumulates from the origin (int'l trips) or the first stop
      // (domestic, no departure arc).
      const completedCoords: [number, number][] = [homeCoords ?? firstStop.coords];

      // ── Departure arc: home → first city (international origin only) ────────
      if (homeCoords) {
        // ── Fly into home country ──
        setStatusMsg(`Starting in ${homeCity}…`);
        await flyAndWait({ center: homeCoords, zoom: 4, duration: 1600 });
        if (cancelled) return;
        await waitForIdle();
        await sleep(500);

        const depBearing = calcBearing(homeCoords, firstStop.coords);

        // Reveal first destination dot
        showCityDots(- 1, 0);

        setStatusMsg(`✈️  ${homeCity} → ${firstStop.name}`);
        fly({
          center: homeCoords,
          zoom: 4.5, pitch: 45, bearing: depBearing,
          duration: 1200, essential: true,
        });
        await sleep(1200);
        await waitForIdle();
        if (cancelled) return;

        // Departure flight with camera tracking
        {
        resetRouteStyle(); // Use thicker plane line style
        const depMx = (homeCoords[0] + firstStop.coords[0]) / 2;
        const depMy = (homeCoords[1] + firstStop.coords[1]) / 2;
        const depDist = Math.sqrt((firstStop.coords[0] - homeCoords[0]) ** 2 + (firstStop.coords[1] - homeCoords[1]) ** 2);
        const depCtrl: [number, number] = [depMx, depMy + depDist * 0.42];
        const depEl = createTransportEl("✈️");
        const depMarker = new maplibregl.Marker({ element: depEl, anchor: "center" }).setLngLat(homeCoords).addTo(map);
        allMarkers.push(depMarker);
        const depSeg: [number, number][] = [homeCoords];
        let depLast = 0;
        const DEP_STEPS = 50;
        await rafAnimate(2200 / speedRef.current, (progress) => {
          const targetStep = Math.min(Math.ceil(progress * DEP_STEPS), DEP_STEPS);
          for (let s = depLast + 1; s <= targetStep; s++) {
            depSeg.push(bezierPt(homeCoords, depCtrl, firstStop.coords, easeInOut(s / DEP_STEPS)));
          }
          depLast = targetStep;
          const pt = bezierPt(homeCoords, depCtrl, firstStop.coords, easeInOut(progress));
          depMarker.setLngLat(pt);
          setRouteCurrent(depSeg);
          // Rotate plane to face travel direction
          const ahead = bezierPt(homeCoords, depCtrl, firstStop.coords, easeInOut(Math.min(progress + 0.02, 1)));
          rotateIconToHeading(depMarker, calcBearing(pt, ahead), map.getBearing());
          // Chase cam — zoom out at midpoint, zoom back in toward destination
          const zoomCurve = 3 + 2.5 * Math.sin(progress * Math.PI);
          const pitchCurve = 35 + 20 * Math.sin(progress * Math.PI);
          map.jumpTo({ center: pt, zoom: zoomCurve, pitch: pitchCurve, bearing: depBearing });
        }, () => cancelled, () => pausedRef.current, () => skipActiveRef.current);
        removeTransportMarker(depMarker);
        completedCoords.push(...depSeg.slice(1));
        }
      }
      if (cancelled) return;
      setRouteDone(completedCoords);
      setRouteCurrent([]);
      await sleep(400);

      // ── City loop ──────────────────────────────────────────────────────────
      for (let i = 0; i < cityStops.length; i++) {
        if (cancelled) return;
        await untilUnpaused();

        const stop = cityStops[i];

        // Show current + next dot, hide future dots
        showCityDots(i, i + 1 < cityStops.length ? i + 1 : -1);

        // Activate city dot with pulse
        const dotEl = allMarkers[i]?.getElement();
        if (dotEl) {
          dotEl.style.cssText = "width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.35);transition:transform 0.5s ease, opacity 0.5s ease, box-shadow 0.5s ease;box-sizing:border-box;pointer-events:none;animation:cityPulse 0.6s ease-out;";
        }

        // Transit between cities (i > 0)
        if (i > 0) {
          const from   = cityStops[i - 1].coords;
          const to     = stop.coords;
          const ttype  = cityStops[i - 1].transportToNext?.type ?? "drive";
          const isFlight = ttype === "flight";
          const transitBearing = calcBearing(from, to);
          const dist = Math.sqrt((to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2);

          setStatusMsg(`${TRANSPORT_EMOJI[ttype]}  ${cityStops[i - 1].name} → ${stop.name}`);

          // Apply transport-specific route styling
          styleRouteForTransport(ttype);

          // Position camera for departure
          if (isFlight) {
            fly({
              center: from,
              zoom: 5, pitch: 50, bearing: transitBearing,
              duration: 1000, essential: true,
            });
          } else {
            fly({
              center: from,
              zoom: Math.max(7, 9 - dist * 0.3), pitch: 55, bearing: transitBearing,
              duration: 1000, essential: true,
            });
          }
          await sleep(1000);
          await waitForIdle();
          if (cancelled) return;

          const mx   = (from[0] + to[0]) / 2;
          const my   = (from[1] + to[1]) / 2;
          const ctrl: [number, number] = isFlight ? [mx, my + dist * 0.42] : [mx, my];

          // Pre-compute road path for car/bus (winding road simulation)
          const isRoad = ttype === "drive" || ttype === "bus";
          const isTrain = ttype === "train";
          const roadPath = isRoad ? generateRoadPath(from, to, 80) : [];
          const railPath = isTrain ? generateRailPath(from, to, 80) : [];

          const txEl = createTransportEl(TRANSPORT_EMOJI[ttype]);
          const txMarker = new maplibregl.Marker({ element: txEl, anchor: "center" }).setLngLat(from).addTo(map);
          allMarkers.push(txMarker);

          const seg: [number, number][] = [from];
          let lastStep = 0;
          const STEPS = 40;

          await rafAnimate((isFlight ? 3200 : isTrain ? 3000 : 2600) / speedRef.current, (progress) => {
            const targetStep = Math.min(Math.ceil(progress * STEPS), STEPS);
            for (let s = lastStep + 1; s <= targetStep; s++) {
              const t = easeInOut(s / STEPS);
              let pt: [number, number];
              if (isFlight) pt = bezierPt(from, ctrl, to, t);
              else if (isRoad) pt = roadPt(roadPath, t);
              else if (isTrain) pt = roadPt(railPath, t);
              else pt = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
              seg.push(pt);
            }
            lastStep = targetStep;
            const t = easeInOut(progress);
            let pt: [number, number];
            if (isFlight) pt = bezierPt(from, ctrl, to, t);
            else if (isRoad) pt = roadPt(roadPath, t);
            else if (isTrain) pt = roadPt(railPath, t);
            else pt = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
            txMarker.setLngLat(pt);
            setRouteCurrent(seg);

            // Rotate icon to face travel direction
            if (isFlight) {
              const ahead = bezierPt(from, ctrl, to, easeInOut(Math.min(progress + 0.02, 1)));
              rotateIconToHeading(txMarker, calcBearing(pt, ahead), map.getBearing());
            } else if (isRoad) {
              const ahead = roadPt(roadPath, Math.min(easeInOut(progress) + 0.03, 1));
              rotateIconToHeading(txMarker, calcBearing(pt, ahead), map.getBearing());
            } else if (isTrain) {
              const ahead = roadPt(railPath, Math.min(easeInOut(progress) + 0.03, 1));
              rotateIconToHeading(txMarker, calcBearing(pt, ahead), map.getBearing());
            } else {
              rotateIconToHeading(txMarker, transitBearing, map.getBearing());
            }

            // Chase-cam: camera follows the vehicle
            if (isFlight) {
              // Flight: zoom out at midpoint, zoom back in approaching destination
              const zoomCurve = 3.5 + 2 * Math.sin(progress * Math.PI);
              const pitchCurve = 40 + 15 * Math.sin(progress * Math.PI);
              map.jumpTo({ center: pt, zoom: zoomCurve, pitch: pitchCurve, bearing: transitBearing });
            } else if (isTrain) {
              // Train: close follow-cam with rhythmic zoom pulse, looking along the rail
              const railAhead = roadPt(railPath, Math.min(easeInOut(progress) + 0.05, 1));
              const railBearing = calcBearing(pt, railAhead);
              const rhythmPulse = Math.sin(progress * Math.PI * 6) * 0.15;
              const trainZoom = Math.max(7.5, 9.5 - dist * 0.25) + rhythmPulse;
              map.jumpTo({ center: pt, zoom: trainZoom, pitch: 50, bearing: railBearing });
            } else {
              // Ground: tight follow-cam with bearing from actual path direction
              const lookAhead = isRoad
                ? roadPt(roadPath, Math.min(easeInOut(progress) + 0.05, 1))
                : to;
              const camBearing = calcBearing(pt, lookAhead);
              const sway = isRoad ? 0 : Math.sin(progress * Math.PI * 2) * 8;
              const groundZoom = Math.max(7, 9 - dist * 0.3);
              map.jumpTo({ center: pt, zoom: groundZoom, pitch: 55, bearing: camBearing + sway });
            }
          }, () => cancelled, () => pausedRef.current, () => skipActiveRef.current);

          removeTransportMarker(txMarker);
          completedCoords.push(...seg.slice(1));
          setRouteDone(completedCoords);
          setRouteCurrent([]);
          resetRouteStyle();
          await sleep(400);
        }

        if (cancelled) return;

        // Fly to city — cinematic descent: swoop in with pitch, then flatten
        setStatusMsg(`Arriving in ${stop.name}…`);
        await flyAndWait({ center: stop.coords, zoom: 11, pitch: 50, bearing: (i * 40) % 360, duration: 1800 });
        if (cancelled) return;
        // Settle to overhead
        await flyAndWait({ center: stop.coords, zoom: 9.5, pitch: 0, bearing: 0, duration: 1200 });
        await waitForIdle();
        if (cancelled) return;

        setActiveCityIdx(i);
        setActiveDayIdx(0);
        setPhase("city");
        currentStopRef.current = i;
        // Stop fast-forwarding once we've reached the jump target (or the next stop
        // for a plain skip). Keep skipping while replaying toward an earlier stop.
        if (jumpToRef.current == null || i >= jumpToRef.current) {
          skipActiveRef.current = false;
          jumpToRef.current = null;
        }
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
          const holdEnd = Date.now() + 2200 / speedRef.current;
          while (Date.now() < holdEnd) {
            if (cancelled || skipActiveRef.current) break;
            await untilUnpaused();
            await sleep(100);
          }
        }

        // Hide card before leaving
        setShowCard(false);
        await sleep(400);
        if (cancelled) return;

        // Zoom out for transit (if more cities remain) — tilt toward next destination
        if (i < cityStops.length - 1) {
          const next = cityStops[i + 1].coords;
          const transitBearing = calcBearing(stop.coords, next);
          fly({
            center: [(stop.coords[0] + next[0]) / 2, (stop.coords[1] + next[1]) / 2],
            zoom: 5, pitch: 40, bearing: transitBearing * 0.3,
            duration: 1300, essential: true,
          });
          await sleep(1300);
          await waitForIdle();
          if (cancelled) return;
        }
      }

      // ── Return arc: last city → home (international origin only) ─────────────
      const lastStop = cityStops[cityStops.length - 1];
      if (homeCoords) {
      const retBearing = calcBearing(lastStop.coords, homeCoords);
      setStatusMsg(`✈️  ${lastStop.name} → ${homeCity}`);

      // Show all visited dots for the final overview
      for (let d = 0; d < cityStops.length; d++) {
        const dotEl = allMarkers[d]?.getElement();
        if (dotEl) { dotEl.style.opacity = "0.5"; dotEl.style.transform = "scale(0.7)"; }
      }

      // Position camera at last city looking homeward
      fly({
        center: lastStop.coords,
        zoom: 4.5, pitch: 45, bearing: retBearing,
        duration: 1200, essential: true,
      });
      await sleep(1200);
      await waitForIdle();
      if (cancelled) return;

      // Return flight with camera tracking
      {
        resetRouteStyle(); // Use thicker plane line style
        const retMx = (lastStop.coords[0] + homeCoords[0]) / 2;
        const retMy = (lastStop.coords[1] + homeCoords[1]) / 2;
        const retDist = Math.sqrt((homeCoords[0] - lastStop.coords[0]) ** 2 + (homeCoords[1] - lastStop.coords[1]) ** 2);
        const retCtrl: [number, number] = [retMx, retMy + retDist * 0.42];
        const retEl = createTransportEl("✈️");
        const retMarker = new maplibregl.Marker({ element: retEl, anchor: "center" }).setLngLat(lastStop.coords).addTo(map);
        allMarkers.push(retMarker);
        const retSeg: [number, number][] = [lastStop.coords];
        let retLast = 0;
        const RET_STEPS = 50;
        await rafAnimate(2200 / speedRef.current, (progress) => {
          const targetStep = Math.min(Math.ceil(progress * RET_STEPS), RET_STEPS);
          for (let s = retLast + 1; s <= targetStep; s++) {
            retSeg.push(bezierPt(lastStop.coords, retCtrl, homeCoords, easeInOut(s / RET_STEPS)));
          }
          retLast = targetStep;
          const pt = bezierPt(lastStop.coords, retCtrl, homeCoords, easeInOut(progress));
          retMarker.setLngLat(pt);
          setRouteCurrent(retSeg);
          // Rotate plane to follow arc
          const retAhead = bezierPt(lastStop.coords, retCtrl, homeCoords, easeInOut(Math.min(progress + 0.02, 1)));
          rotateIconToHeading(retMarker, calcBearing(pt, retAhead), map.getBearing());
          const zoomCurve = 3 + 2.5 * Math.sin(progress * Math.PI);
          const pitchCurve = 35 + 20 * Math.sin(progress * Math.PI);
          map.jumpTo({ center: pt, zoom: zoomCurve, pitch: pitchCurve, bearing: retBearing });
        }, () => cancelled, () => pausedRef.current, () => skipActiveRef.current);
        removeTransportMarker(retMarker);
        completedCoords.push(...retSeg.slice(1));
      }
      if (cancelled) return;
      setRouteDone(completedCoords);
      setRouteCurrent([]);
      await sleep(400);

      // Zoom into home country — flat for a calm landing
      setStatusMsg(`Welcome back to ${homeCity}!`);
      await flyAndWait({ center: homeCoords, zoom: 5, pitch: 0, bearing: 0, duration: 2000 });
      if (cancelled) return;
      await sleep(500);
      } else {
        // Domestic (no origin): settle over the final stop instead of flying home.
        await flyAndWait({ center: lastStop.coords, zoom: 6, pitch: 0, bearing: 0, duration: 1600 });
        if (cancelled) return;
        await sleep(500);
      }

      setStatusMsg("Trip complete!");
      skipActiveRef.current = false;
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
  }, [runId]);

  const activeStop  = activeCityIdx >= 0 ? cityStops[activeCityIdx] : null;
  const activeDay   = activeStop?.days[activeDayIdx] ?? null;
  const cityPhotos  = (cityPhotoMap[activeStop?.name ?? ""] ?? []).filter((u) => !brokenImgs.has(u));
  const mapAvailable = !!mainMapRef?.current;
  // Departure identity for the panel chrome — absent for domestic (no-origin) routes.
  const homeCity  = origin?.city ?? "";
  const homeLabel = origin?.label ?? "";

  return createPortal(
    <div className="fixed inset-0 z-[200]" style={{ fontFamily: "inherit" }}>

      {/* ── Left area — transparent, main map shows through ─────────────────── */}
      <div className="absolute top-0 left-0 bottom-0" style={{ right: isMobile ? 0 : panelWidth }}>

        {/* Subtle dim during transit/intro */}
        <div
          className="absolute inset-0 bg-black pointer-events-none"
          style={{ opacity: !showCard ? 0.3 : 0.1, transition: "opacity 0.8s ease" }}
        />

        {/* ── Photo card — appears during city phase ───────────────────────── */}
        {phase === "city" && (
          <CinematicPhotoCard
            show={showCard}
            photos={cityPhotos}
            slideIdx={slideIdx}
            stopName={activeStop?.name ?? ""}
            theme={activeDay?.theme}
            dayCount={activeStop?.days.length ?? 0}
            activeDayIdx={activeDayIdx}
            onBrokenImage={(url) => setBrokenImgs((s) => new Set(s).add(url))}
          />
        )}

        {/* Status pill (transit / intro phases) */}
        {!showCard && (
          <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
            <div className="bg-black/70 backdrop-blur-sm text-white text-sm font-semibold px-5 py-2.5 rounded-full max-w-sm text-center shadow-lg">
              {mapAvailable ? statusMsg : "⚠ Switch to Map view to start the cinematic journey"}
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

      {/* ── Drag handle — desktop only ─────────── */}
      {!isMobile && (
        <div
          className="absolute top-0 bottom-0 z-[210] cursor-col-resize select-none group"
          style={{ right: panelWidth - 6, width: 12 }}
          onPointerDown={startPanelDrag}
        >
          <div className="absolute inset-y-0 left-[5px] w-[2px] bg-white/10 group-hover:bg-blue-400/50 transition-colors" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-[5px]">
            {[0,1,2,3].map((i) => (
              <div key={i} className="w-[3px] h-[3px] rounded-full bg-white/30 group-hover:bg-blue-400/70 transition-colors" />
            ))}
          </div>
        </div>
      )}

      {/* ── Right panel (desktop) / Bottom sheet (mobile) ──────────────────── */}
      <div
        className={isMobile
          ? "absolute bottom-0 left-0 right-0 bg-gray-950/95 backdrop-blur-md text-white flex flex-col max-h-[40dvh] rounded-t-2xl z-[205] shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
          : "absolute top-0 right-0 bottom-0 bg-gray-950 text-white flex flex-col"
        }
        style={isMobile ? undefined : { width: panelWidth }}
      >
        {/* Mobile drag handle indicator */}
        {isMobile && (
          <div className="flex justify-center py-2 shrink-0">
            <div className="w-10 h-1 rounded-full bg-white/30" />
          </div>
        )}

        {/* Header */}
        <CinematicHeader
          title={title}
          duration={plan.duration}
          isMobile={isMobile}
          homeCity={homeCity}
          showOrigin={!!origin}
          stops={cityStops}
          activeCityIdx={activeCityIdx}
          onClose={onClose}
        />

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {phase === "intro" && (
            <CinematicIntro
              showOrigin={!!origin}
              homeCity={homeCity}
              homeLabel={homeLabel}
              title={title}
              plan={plan}
              comboCountries={comboCountries}
              statusMsg={statusMsg}
              mapAvailable={mapAvailable}
            />
          )}

          {phase === "city" && activeStop && activeDay && (
            <CinematicDayPanel
              stop={activeStop}
              day={activeDay}
              stopIndex={activeCityIdx}
              stopCount={cityStops.length}
              dayIndex={activeDayIdx}
              visibleActs={visibleActs}
            />
          )}

          {phase === "done" && (
            <CinematicDone showOrigin={!!origin} homeCity={homeCity} plan={plan} />
          )}
        </div>

        {/* Footer */}
        <div className={`${isMobile ? "px-4 py-3" : "px-5 py-4"} border-t border-white/10 flex items-center justify-between shrink-0`}>
          <CinematicControls
            ctrlBtnSize={ctrlBtnSize}
            canGoPrev={activeCityIdx > 0}
            paused={paused}
            speed={speed}
            onPrev={prevStep}
            onTogglePause={() => setPaused((p) => !p)}
            onSkip={skipStep}
            onCycleSpeed={cycleSpeed}
            onClose={onClose}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
