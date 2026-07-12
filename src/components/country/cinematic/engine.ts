import maplibregl from "maplibre-gl";
import type { Country, CityEntry } from "../../../core/types";
import type { TripPlan, DayEntry } from "../../../core/utils/tripPlans";
import { extractCityFromLabel } from "../../../core/utils/tripPlans";
import type { CountryRule } from "../../../core/data/itineraryRules";
import { haversineKm } from "../../../core/utils/routeOrder";
import { VEHICLE_SVG, TRANSPORT_COLORS, buildVehicleSvgNode } from "../../../utils/vehicleMarkers";
import { type TransportType, detectTransport } from "../../../core/utils/transport";


export type CityStop = {
  name: string;
  coords: [number, number];
  days: DayEntry[];
  transportToNext?: { type: TransportType; label: string };
};

/** Minimal coordinate-bearing city shape the stop builder needs (scope-agnostic). */
type CityCoord = Pick<CityEntry, "name" | "lat" | "lng">;

/**
 * Group a single plan's days into ordered city stops, resolving coordinates from
 * the supplied city list and inter-city transport from the unit's rule. The
 * lower-level primitive behind {@link buildCityStops} and the multi-unit
 * {@link buildCinematicRoute} — it knows nothing about "country", so a future
 * domestic (state/city) unit flows through unchanged.
 */
export function buildSegmentStops(
  plan: TripPlan,
  cities: readonly CityCoord[],
  rule?: CountryRule | null,
): CityStop[] {
  const coordsMap = new Map<string, [number, number]>();
  cities.forEach((c) => coordsMap.set(c.name, [c.lng, c.lat]));

  const groups: { name: string; days: DayEntry[] }[] = [];
  for (const day of plan.days) {
    const city = extractCityFromLabel(day.label);
    if (!city) continue;
    const last = groups[groups.length - 1];
    if (last && last.name === city) last.days.push(day);
    else groups.push({ name: city, days: [day] });
  }

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

export function buildCityStops(plan: TripPlan, country: Country, rule?: CountryRule | null): CityStop[] {
  return buildSegmentStops(plan, country.cities ?? [], rule);
}

// ─── Scope-agnostic cinematic route model ─────────────────────────────────────

/**
 * One plannable unit on a cinematic route — a country today, a state/city under a
 * future domestic scope. Carries everything the fly-through needs to render this
 * unit's stops without knowing what kind of unit it is.
 */
export interface CinematicSegment {
  /** Unit display name (country/state). */
  name: string;
  /** Unit centroid `[lng, lat]` — used for the world-overview framing. */
  center: [number, number];
  /** This unit's itinerary. */
  plan: TripPlan;
  /** Coordinate source for the unit's cities. */
  cities: readonly CityCoord[];
  /** Rule chunk (connections + city images); null when the unit has no offline data. */
  rule?: CountryRule | null;
}

/** Where the journey departs from (and returns to). Null → no intro/return arc. */
export interface CinematicOrigin {
  coords: [number, number];
  /** Departure city label, e.g. "New Delhi". */
  city: string;
  /** Origin region label, e.g. "India". */
  label: string;
}

/**
 * The fully-resolved route the fly-through animates. Flattens N units into one
 * ordered stop list (border hops between units encoded as the previous stop's
 * `transportToNext`), merges every unit's city images, and carries the composed
 * plan for the headline stats. Single-unit routes are byte-identical to the old
 * single-country path; multi-unit and future domestic routes reuse the same shape.
 */
export interface CinematicRoute {
  title: string;
  /** Composed (or single) plan — drives duration / cost / note / basis icon. */
  plan: TripPlan;
  stops: CityStop[];
  origin: CinematicOrigin | null;
  cityImages: Record<string, string[]>;
  /** Camera target for the opening world overview. */
  overviewCenter: [number, number];
  comboCountries?: Array<{ name: string; lat: number; lng: number }>;
}

/** Beyond this great-circle distance an inter-unit hop is animated as a flight. */
const INTER_UNIT_FLIGHT_KM = 300;

/** Indicative transport for an inter-unit (border) hop, derived only from distance. */
export function interUnitTransport(
  from: [number, number],
  to: [number, number],
): { type: TransportType; label: string } {
  const km = haversineKm({ lat: from[1], lng: from[0] }, { lat: to[1], lng: to[0] });
  return km >= INTER_UNIT_FLIGHT_KM
    ? { type: "flight", label: "Flight" }
    : { type: "train", label: "Rail / road" };
}

function centroid(points: [number, number][]): [number, number] | null {
  if (points.length === 0) return null;
  const sum = points.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]] as [number, number], [0, 0]);
  return [sum[0] / points.length, sum[1] / points.length];
}

/**
 * The international departure origin for a home country, with the same fallbacks
 * the single-country cinematic always used. A future domestic scope passes
 * `origin: null` to {@link buildCinematicRoute} instead (no international arc).
 */
export function resolveHomeOrigin(homeCountry: string): CinematicOrigin {
  return {
    coords: HOME_COORDS[homeCountry] ?? [20, 20],
    city: HOME_CITY[homeCountry] ?? homeCountry,
    label: homeCountry,
  };
}

/**
 * Compose one cinematic route from ordered units. Border hops between consecutive
 * units are stamped onto the previous stop's `transportToNext` (distance-derived),
 * city images are merged, and the overview frames the origin against the units'
 * centroid. N=1 yields the same stops/overview as the legacy single-country path.
 */
export function buildCinematicRoute(
  segments: CinematicSegment[],
  opts: {
    title: string;
    plan: TripPlan;
    origin: CinematicOrigin | null;
    comboCountries?: Array<{ name: string; lat: number; lng: number }>;
  },
): CinematicRoute {
  const stops: CityStop[] = [];
  const cityImages: Record<string, string[]> = {};
  const activeCenters: [number, number][] = [];

  for (const seg of segments) {
    const segStops = buildSegmentStops(seg.plan, seg.cities, seg.rule);
    if (segStops.length === 0) continue;
    // Bridge the previous unit's last stop to this unit's first stop (border hop).
    const prev = stops[stops.length - 1];
    if (prev) prev.transportToNext = interUnitTransport(prev.coords, segStops[0].coords);
    stops.push(...segStops);
    activeCenters.push(seg.center);
    if (seg.rule?.cityImages) Object.assign(cityImages, seg.rule.cityImages);
  }

  const unitsCentroid = centroid(activeCenters) ?? centroid(stops.map((s) => s.coords)) ?? opts.origin?.coords ?? [20, 20];
  const overviewCenter: [number, number] = opts.origin
    ? [(opts.origin.coords[0] + unitsCentroid[0]) / 2, (opts.origin.coords[1] + unitsCentroid[1]) / 2]
    : unitsCentroid;

  return {
    title: opts.title,
    plan: opts.plan,
    stops,
    origin: opts.origin,
    cityImages,
    overviewCenter,
    comboCountries: opts.comboCountries,
  };
}

/** Convenience: a single-country cinematic route (international origin). */
export function buildSingleCountryRoute(
  plan: TripPlan,
  country: Country,
  rule: CountryRule | null | undefined,
  homeCountry: string,
  comboCountries?: Array<{ name: string; lat: number; lng: number }>,
): CinematicRoute {
  return buildCinematicRoute(
    [{ name: country.name, center: [country.lng, country.lat], plan, cities: country.cities ?? [], rule }],
    { title: country.name, plan, origin: resolveHomeOrigin(homeCountry), comboCountries },
  );
}

// ─── Home departure city coords + names ──────────────────────────────────────

// Coordinates of the primary international departure city for each home country
export const HOME_COORDS: Record<string, [number, number]> = {
  "India":          [77.10,   28.56],   // New Delhi (IGI Airport)
  "United States":  [-73.78,  40.64],   // New York (JFK)
  "USA":            [-73.78,  40.64],   // New York (JFK) — alias
  "United Kingdom": [-0.46,   51.47],   // London (Heathrow)
  "Germany":        [8.57,    50.03],   // Frankfurt Airport
  "France":         [2.55,    49.01],   // Paris (CDG)
  "Australia":      [151.18, -33.94],   // Sydney (Kingsford Smith)
  "Canada":         [-79.63,  43.68],   // Toronto (Pearson)
  "Singapore":      [103.99,   1.36],   // Singapore (Changi)
  "United Arab Emirates": [55.36, 25.25], // Dubai (DXB)
  "Japan":          [139.78,  35.55],   // Tokyo (Narita)
  "South Korea":    [126.45,  37.46],   // Seoul (Incheon)
  "Netherlands":    [4.76,    52.31],   // Amsterdam (Schiphol)
  "Italy":          [12.25,   41.80],   // Rome (Fiumicino)
  "Spain":          [-3.57,   40.47],   // Madrid (Barajas)
  "Brazil":         [-46.47, -23.43],   // São Paulo (Guarulhos)
  "South Africa":   [28.25,  -26.13],   // Johannesburg (OR Tambo)
};

// Display name of the departure city (used in status messages)
export const HOME_CITY: Record<string, string> = {
  "India":          "New Delhi",
  "United States":  "New York",
  "USA":            "New York",
  "United Kingdom": "London",
  "Germany":        "Frankfurt",
  "France":         "Paris",
  "Australia":      "Sydney",
  "Canada":         "Toronto",
  "Singapore":      "Singapore",
  "United Arab Emirates": "Dubai",
  "Japan":          "Tokyo",
  "South Korea":    "Seoul",
  "Netherlands":    "Amsterdam",
  "Italy":          "Rome",
  "Spain":          "Madrid",
  "Brazil":         "São Paulo",
  "South Africa":   "Johannesburg",
};

// ─── Bezier helper ────────────────────────────────────────────────────────────

// Easing: smooth-step (ease-in-out) for natural arc motion
export function easeInOut(t: number): number {
  return t * t * (3 - 2 * t);
}

// Generate road-like waypoints with gentle lateral curves (zig-zag)
// Simulates following a winding road between two geographic points
export function generateRoadPath(
  from: [number, number], to: [number, number], steps: number
): [number, number][] {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dist = Math.sqrt(dx * dx + dy * dy);
  // Perpendicular direction for lateral offsets
  const perpX = -dy / (dist || 1);
  const perpY = dx / (dist || 1);
  // Amplitude scales with distance but capped
  const amp = Math.min(dist * 0.08, 0.6);
  const curves: [number, number][] = [];
  // 3-4 gentle S-curves along the path
  const freq = 2.5 + Math.random() * 1.5;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lateral = Math.sin(t * Math.PI * freq) * amp * Math.sin(t * Math.PI);
    curves.push([
      from[0] + dx * t + perpX * lateral,
      from[1] + dy * t + perpY * lateral,
    ]);
  }
  return curves;
}

// Generate rail-like waypoints — smooth long-radius sweeping curves
// Real railways use gradual bends, not sharp turns or straight lines
export function generateRailPath(
  from: [number, number], to: [number, number], steps: number
): [number, number][] {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dist = Math.sqrt(dx * dx + dy * dy);
  const perpX = -dy / (dist || 1);
  const perpY = dx / (dist || 1);
  // Wider, gentler curves than road — 1-2 sweeping bends
  const amp = Math.min(dist * 0.12, 0.8);
  const path: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Single smooth S-curve (low frequency) with envelope
    const envelope = Math.sin(t * Math.PI);
    const lateral = Math.sin(t * Math.PI * 1.5) * amp * envelope;
    path.push([
      from[0] + dx * t + perpX * lateral,
      from[1] + dy * t + perpY * lateral,
    ]);
  }
  return path;
}

// Interpolate along a precomputed road path using eased progress
export function roadPt(path: [number, number][], progress: number): [number, number] {
  const idx = progress * (path.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, path.length - 1);
  const frac = idx - lo;
  return [
    path[lo][0] + (path[hi][0] - path[lo][0]) * frac,
    path[lo][1] + (path[hi][1] - path[lo][1]) * frac,
  ];
}

// Rotate the inner SVG icon of a transport marker to face a heading
export function rotateIconToHeading(marker: maplibregl.Marker, heading: number, mapBearing: number) {
  const icon = marker.getElement().querySelector(".transport-icon") as HTMLElement | null;
  if (!icon) return;
  const screenAngle = heading - mapBearing;
  icon.style.transform = `rotate(${screenAngle}deg)`;
}

// Build a 3D transport marker with SVG vehicle icon, shadow, and glow
export function createTransportEl(emoji: string): HTMLDivElement {
  const isPlane = emoji === "✈️";
  const isBus = emoji === "🚌";

  if (isPlane) {
    // Clean plane marker — no orb, just the aircraft silhouette + contrail
    const el = document.createElement("div");
    el.style.cssText = [
      "width:64px;height:64px",
      "position:relative",
      "pointer-events:none",
      "transform:scale(0)",
      "transition:transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
    ].join(";");

    const iconBox = document.createElement("div");
    iconBox.className = "transport-icon";
    iconBox.style.cssText = [
      "position:absolute;inset:0",
      "display:flex;align-items:center;justify-content:center",
      "transition:transform 0.08s linear",
    ].join(";");

    // Contrail — streams behind the plane (below center since plane points up)
    const trail = document.createElement("div");
    trail.className = "plane-contrail";
    trail.style.cssText = [
      "position:absolute;top:55%;left:50%;transform:translateX(-50%)",
      "width:3px;height:0px",
      "background:linear-gradient(to bottom,rgba(140,190,255,0.8) 0%,rgba(100,160,255,0.4) 40%,transparent 100%)",
      "border-radius:2px",
      "filter:blur(1.5px)",
      "pointer-events:none",
      "transition:height 0.6s ease-out",
    ].join(";");
    iconBox.appendChild(trail);

    // Second, wider contrail for glow
    const trail2 = document.createElement("div");
    trail2.className = "plane-contrail-glow";
    trail2.style.cssText = [
      "position:absolute;top:55%;left:50%;transform:translateX(-50%)",
      "width:8px;height:0px",
      "background:linear-gradient(to bottom,rgba(100,160,255,0.3) 0%,rgba(80,140,255,0.1) 50%,transparent 100%)",
      "border-radius:4px",
      "filter:blur(4px)",
      "pointer-events:none",
      "transition:height 0.6s ease-out",
    ].join(";");
    iconBox.appendChild(trail2);

    // Plane SVG
    const svgWrap = document.createElement("div");
    svgWrap.style.cssText = "position:relative;width:100%;height:100%;z-index:1;";
    const svgEl = buildVehicleSvgNode(VEHICLE_SVG[emoji]);
    if (svgEl) svgWrap.appendChild(svgEl);
    iconBox.appendChild(svgWrap);

    el.appendChild(iconBox);

    // Grow contrail after plane appears
    requestAnimationFrame(() => {
      el.style.transform = "scale(1)";
      setTimeout(() => {
        trail.style.height = "90px";
        trail2.style.height = "80px";
      }, 300);
    });
    return el;
  }

  if (isBus) {
    // Bus — circular orb marker with icon inside (mult.dev style)
    const el = document.createElement("div");
    el.style.cssText = [
      "width:52px;height:52px",
      "position:relative",
      "pointer-events:none",
      "transform:scale(0)",
      "transition:transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
    ].join(";");

    const iconBox = document.createElement("div");
    iconBox.className = "transport-icon";
    iconBox.style.cssText = [
      "position:absolute;inset:0",
      "display:flex;align-items:center;justify-content:center",
      "transition:transform 0.08s linear",
    ].join(";");

    // White outer ring
    const ring = document.createElement("div");
    ring.style.cssText = [
      "position:absolute;inset:-4px",
      "border-radius:50%",
      "border:3px solid white",
      "box-shadow:0 4px 16px rgba(0,0,0,0.25),0 0 0 1px rgba(59,130,246,0.2)",
      "pointer-events:none",
    ].join(";");
    iconBox.appendChild(ring);

    // Light blue circle background
    const circle = document.createElement("div");
    circle.style.cssText = [
      "position:absolute;inset:0",
      "border-radius:50%",
      "background:linear-gradient(145deg,rgba(191,219,254,0.95) 0%,rgba(147,197,253,0.9) 50%,rgba(96,165,250,0.85) 100%)",
      "display:flex;align-items:center;justify-content:center",
      "padding:10px",
      "box-shadow:inset 0 2px 6px rgba(255,255,255,0.6),inset 0 -2px 4px rgba(59,130,246,0.15)",
    ].join(";");
    const svgEl = buildVehicleSvgNode(VEHICLE_SVG[emoji]);
    if (svgEl) circle.appendChild(svgEl);
    iconBox.appendChild(circle);

    el.appendChild(iconBox);

    requestAnimationFrame(() => { el.style.transform = "scale(1)"; });
    return el;
  }

  // Car, Train, Ferry, Cable car — clean silhouette with colored motion trail
  const colors = TRANSPORT_COLORS[emoji] ?? TRANSPORT_COLORS["⛴️"];
  const el = document.createElement("div");
  el.style.cssText = [
    "width:56px;height:56px",
    "position:relative",
    "pointer-events:none",
    "transform:scale(0)",
    "transition:transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
  ].join(";");

  const iconBox = document.createElement("div");
  iconBox.className = "transport-icon";
  iconBox.style.cssText = [
    "position:absolute;inset:0",
    "display:flex;align-items:center;justify-content:center",
    "transition:transform 0.08s linear",
  ].join(";");

  // Colored motion trail behind the vehicle
  const motionTrail = document.createElement("div");
  motionTrail.className = "ground-motion-trail";
  motionTrail.style.cssText = [
    `position:absolute;top:60%;left:50%;transform:translateX(-50%)`,
    `width:6px;height:0px`,
    `background:linear-gradient(to bottom,${colors.trail} 0%,${colors.glow} 40%,transparent 100%)`,
    "border-radius:3px",
    "filter:blur(2px)",
    "pointer-events:none",
    "transition:height 0.6s ease-out",
  ].join(";");
  iconBox.appendChild(motionTrail);

  // SVG icon
  const svgWrap = document.createElement("div");
  svgWrap.style.cssText = "position:relative;width:100%;height:100%;z-index:1;";
  const svgEl = buildVehicleSvgNode(VEHICLE_SVG[emoji]);
  if (svgEl) {
    svgWrap.appendChild(svgEl);
  } else {
    svgWrap.style.cssText += "font-size:32px;display:flex;align-items:center;justify-content:center;";
    svgWrap.textContent = emoji;
  }
  iconBox.appendChild(svgWrap);

  el.appendChild(iconBox);

  requestAnimationFrame(() => {
    el.style.transform = "scale(1)";
    setTimeout(() => { motionTrail.style.height = "40px"; }, 300);
  });
  return el;
}

export function removeTransportMarker(marker: maplibregl.Marker) {
  const el = marker.getElement();
  // Shrink contrail first for planes
  const trails = el.querySelectorAll(".plane-contrail, .plane-contrail-glow");
  trails.forEach((t) => { (t as HTMLElement).style.height = "0px"; });
  el.style.transform = "scale(0)";
  el.style.opacity = "0";
  el.style.transition = "transform 0.35s ease-in, opacity 0.35s ease-in";
  setTimeout(() => marker.remove(), 400);
}

export function bezierPt(p0: [number, number], p1: [number, number], p2: [number, number], t: number): [number, number] {
  return [
    (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0],
    (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1],
  ];
}

// ─── rAF animation helper ─────────────────────────────────────────────────────

// Strip undefined camera keys so MapLibre's jumpTo never receives NaN bearing/pitch
// (passing `undefined` sets them to NaN → "failed to invert matrix").
export function cleanJumpOptions(opts: maplibregl.FlyToOptions): maplibregl.JumpToOptions {
  const o: maplibregl.JumpToOptions = {};
  if (opts.center !== undefined) o.center = opts.center;
  if (opts.zoom !== undefined) o.zoom = opts.zoom;
  if (opts.bearing !== undefined) o.bearing = opts.bearing;
  if (opts.pitch !== undefined) o.pitch = opts.pitch;
  return o;
}

// Smooth requestAnimationFrame loop — replaces setTimeout stepping for jank-free 60fps
export function rafAnimate(
  durationMs: number,
  onProgress: (t: number) => void,
  isCancelled: () => boolean,
  isPaused: () => boolean,
  isSkipped?: () => boolean,
): Promise<void> {
  return new Promise((resolve) => {
    let start: number | null = null;
    let pausedAccum = 0;
    let pauseStart: number | null = null;

    function tick(now: number) {
      if (isCancelled()) { resolve(); return; }
      if (isSkipped?.()) { onProgress(1); resolve(); return; }

      if (isPaused()) {
        if (!pauseStart) pauseStart = now;
        requestAnimationFrame(tick);
        return;
      }
      if (pauseStart) {
        pausedAccum += now - pauseStart;
        pauseStart = null;
      }

      if (start === null) start = now;
      const elapsed = now - start - pausedAccum;
      const t = Math.min(elapsed / durationMs, 1);
      onProgress(t);

      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    }

    requestAnimationFrame(tick);
  });
}

// ─── Bearing between two lng/lat points ───────────────────────────────────────

export function calcBearing(from: [number, number], to: [number, number]): number {
  const toRad = Math.PI / 180;
  const dLng = (to[0] - from[0]) * toRad;
  const lat1 = from[1] * toRad;
  const lat2 = to[1] * toRad;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// ─── Map layer IDs ────────────────────────────────────────────────────────────

export const SRC_DONE    = "cinematic-route-done";
export const SRC_CURRENT = "cinematic-route-current";
export const LYR_DONE    = "cinematic-route-done";
export const LYR_CURRENT = "cinematic-route-current";
export const LYR_TRACKS  = "cinematic-route-tracks";     // railroad tracks overlay
export const LYR_TRACKS_TIES = "cinematic-route-ties";   // cross ties for railroad

// ─── Component ────────────────────────────────────────────────────────────────
