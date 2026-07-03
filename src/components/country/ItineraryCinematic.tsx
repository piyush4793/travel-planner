import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import maplibregl from "maplibre-gl";
import type { Country } from "../../core/types";
import type { TripPlan, DayEntry } from "../../core/utils/tripPlans";
import { extractCityFromLabel, planCostBasisIcon } from "../../core/utils/tripPlans";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import type { CountryRule } from "../../core/data/itineraryRules";
import { getWikiImage } from "../../utils/wikiImages";
import { type TransportType, TRANSPORT_EMOJI, detectTransport } from "../../core/utils/transport";
import { usePanelDrag } from "../../hooks/usePanelDrag";

// ─── City stops ───────────────────────────────────────────────────────────────

type CityStop = {
  name: string;
  coords: [number, number];
  days: DayEntry[];
  transportToNext?: { type: TransportType; label: string };
};

function buildCityStops(plan: TripPlan, country: Country, rule?: CountryRule | null): CityStop[] {
  const coordsMap = new Map<string, [number, number]>();
  (country.cities ?? []).forEach((c) => coordsMap.set(c.name, [c.lng, c.lat]));

  const groups: { name: string; days: DayEntry[] }[] = [];
  for (const day of plan.days) {
    const city = extractCityFromLabel(day.label);
    if (!city) continue;
    const last = groups[groups.length - 1];
    if (last && last.name === city) last.days.push(day);
    else groups.push({ name: city, days: [day] });
  }

  // rule passed as prop
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
const HOME_CITY: Record<string, string> = {
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
function easeInOut(t: number): number {
  return t * t * (3 - 2 * t);
}

// Generate road-like waypoints with gentle lateral curves (zig-zag)
// Simulates following a winding road between two geographic points
function generateRoadPath(
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
function generateRailPath(
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
function roadPt(path: [number, number][], progress: number): [number, number] {
  const idx = progress * (path.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, path.length - 1);
  const frac = idx - lo;
  return [
    path[lo][0] + (path[hi][0] - path[lo][0]) * frac,
    path[lo][1] + (path[hi][1] - path[lo][1]) * frac,
  ];
}

// ─── SVG vehicle icons for 3D transport markers ──────────────────────────────

// Top-down / bird's-eye vehicle silhouettes — pointing UP (north) by default.
// Flights rotate to follow arc heading; ground vehicles stay fixed.
const VEHICLE_SVG: Record<string, string> = {
  // Airplane — clean white commercial airliner top-down silhouette (no orb)
  "✈️": `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pg" x1="20" y1="2" x2="44" y2="58"><stop stop-color="#ffffff"/><stop offset="0.5" stop-color="#f0f4f8"/><stop offset="1" stop-color="#c8d6e5"/></linearGradient>
      <filter id="planeShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/></filter>
    </defs>
    <g filter="url(#planeShadow)">
      <path d="M32 3C33 3 34 4 34.5 7L35.5 18L54 26C55 26.4 55 27.6 54 28L35.5 28L36 42L43 50C43.5 50.5 43.2 51.5 42.5 51.5L35 48L33 52C32.7 52.6 31.3 52.6 31 52L29 48L21.5 51.5C20.8 51.5 20.5 50.5 21 50L28 42L28.5 28L10 28C9 27.6 9 26.4 10 26L28.5 18L29.5 7C30 4 31 3 32 3Z" fill="url(#pg)" stroke="rgba(200,210,225,0.6)" stroke-width="0.4"/>
      <ellipse cx="32" cy="14" rx="1.8" ry="6" fill="rgba(255,255,255,0.35)"/>
      <path d="M31 7L33 7L33.5 18L30.5 18Z" fill="rgba(200,215,235,0.25)"/>
    </g>
  </svg>`,
  // Car — 3D convertible with glossy paint, chrome, leather seats, reflections
  "🚗": `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="ctd" cx="0.4" cy="0.35" r="0.7"><stop stop-color="#ff6b6b"/><stop offset="0.4" stop-color="#ef4444"/><stop offset="0.8" stop-color="#b91c1c"/><stop offset="1" stop-color="#7f1d1d"/></radialGradient>
      <linearGradient id="cshine" x1="16" y1="6" x2="48" y2="56"><stop stop-color="rgba(255,255,255,0.5)"/><stop offset="0.3" stop-color="rgba(255,255,255,0.05)"/><stop offset="1" stop-color="rgba(0,0,0,0.1)"/></linearGradient>
      <radialGradient id="cseat" cx="0.5" cy="0.4" r="0.6"><stop stop-color="#a16207"/><stop offset="0.7" stop-color="#78350f"/><stop offset="1" stop-color="#451a03"/></radialGradient>
      <linearGradient id="cglass" x1="20" y1="8" x2="44" y2="12"><stop stop-color="rgba(147,197,253,0.8)"/><stop offset="0.5" stop-color="rgba(96,165,250,0.5)"/><stop offset="1" stop-color="rgba(59,130,246,0.7)"/></linearGradient>
      <filter id="carShadow" x="-25%" y="-15%" width="150%" height="140%"><feDropShadow dx="1" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.45)"/></filter>
    </defs>
    <g filter="url(#carShadow)">
      <path d="M24 6C21 6 17 9 16 13L15 22L15 46C15 51 19 55 24 55L40 55C45 55 49 51 49 46L49 22L48 13C47 9 43 6 40 6Z" fill="url(#ctd)"/>
      <path d="M24 6C21 6 17 9 16 13L15 22L15 46C15 51 19 55 24 55L40 55C45 55 49 51 49 46L49 22L48 13C47 9 43 6 40 6Z" fill="url(#cshine)"/>
      <path d="M18 10L46 10L48 13L47 16L17 16L16 13Z" fill="url(#cglass)" stroke="rgba(200,200,200,0.3)" stroke-width="0.4"/>
      <path d="M20 10L36 10" stroke="rgba(255,255,255,0.6)" stroke-width="0.5"/>
      <ellipse cx="26" cy="26" rx="5" ry="6.5" fill="url(#cseat)"/><ellipse cx="38" cy="26" rx="5" ry="6.5" fill="url(#cseat)"/>
      <path d="M23 23L29 23" stroke="rgba(255,255,255,0.15)" stroke-width="0.8" stroke-linecap="round"/><path d="M35 23L41 23" stroke="rgba(255,255,255,0.15)" stroke-width="0.8" stroke-linecap="round"/>
      <ellipse cx="26" cy="38" rx="5" ry="6" fill="url(#cseat)" opacity="0.85"/><ellipse cx="38" cy="38" rx="5" ry="6" fill="url(#cseat)" opacity="0.85"/>
      <rect x="30" y="18" width="4" height="8" rx="1" fill="rgba(140,140,140,0.4)"/>
      <circle cx="31" cy="20" r="1.5" fill="rgba(200,200,200,0.5)"/>
      <rect x="13" y="15" width="5" height="9" rx="2.5" fill="rgba(20,20,20,0.7)" stroke="rgba(80,80,80,0.3)" stroke-width="0.4"/><rect x="46" y="15" width="5" height="9" rx="2.5" fill="rgba(20,20,20,0.7)" stroke="rgba(80,80,80,0.3)" stroke-width="0.4"/>
      <rect x="13" y="38" width="5" height="9" rx="2.5" fill="rgba(20,20,20,0.7)" stroke="rgba(80,80,80,0.3)" stroke-width="0.4"/><rect x="46" y="38" width="5" height="9" rx="2.5" fill="rgba(20,20,20,0.7)" stroke="rgba(80,80,80,0.3)" stroke-width="0.4"/>
      <circle cx="22" cy="8" r="2.2" fill="#fbbf24"/><circle cx="22" cy="8" r="1.2" fill="#fef3c7" opacity="0.9"/>
      <circle cx="42" cy="8" r="2.2" fill="#fbbf24"/><circle cx="42" cy="8" r="1.2" fill="#fef3c7" opacity="0.9"/>
      <circle cx="22" cy="53" r="1.8" fill="#dc2626"/><circle cx="22" cy="53" r="0.8" fill="#fca5a5" opacity="0.7"/>
      <circle cx="42" cy="53" r="1.8" fill="#dc2626"/><circle cx="42" cy="53" r="0.8" fill="#fca5a5" opacity="0.7"/>
      <path d="M16 6Q32 4 48 6" stroke="rgba(255,255,255,0.3)" stroke-width="0.6" fill="none"/>
      <path d="M17 30L15 30" stroke="rgba(200,200,200,0.25)" stroke-width="0.8"/><path d="M49 30L47 30" stroke="rgba(200,200,200,0.25)" stroke-width="0.8"/>
    </g>
  </svg>`,
  // Train — 3D bullet train with metallic body, specular highlights, depth
  "🚂": `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ttd" x1="18" y1="0" x2="46" y2="62"><stop stop-color="#f0fdf4"/><stop offset="0.1" stop-color="#dcfce7"/><stop offset="0.4" stop-color="#22c55e"/><stop offset="0.7" stop-color="#16a34a"/><stop offset="1" stop-color="#14532d"/></linearGradient>
      <linearGradient id="tshine" x1="20" y1="0" x2="44" y2="62"><stop stop-color="rgba(255,255,255,0.55)"/><stop offset="0.15" stop-color="rgba(255,255,255,0.2)"/><stop offset="0.5" stop-color="rgba(255,255,255,0)"/><stop offset="1" stop-color="rgba(0,0,0,0.15)"/></linearGradient>
      <linearGradient id="tglass" x1="24" y1="0" x2="40" y2="10"><stop stop-color="rgba(186,230,253,0.85)"/><stop offset="0.5" stop-color="rgba(125,211,252,0.6)"/><stop offset="1" stop-color="rgba(56,189,248,0.8)"/></linearGradient>
      <radialGradient id="tnose" cx="0.5" cy="0.3" r="0.6"><stop stop-color="#f0fdf4"/><stop offset="0.5" stop-color="#bbf7d0"/><stop offset="1" stop-color="#22c55e"/></radialGradient>
      <filter id="trainShadow" x="-25%" y="-15%" width="150%" height="140%"><feDropShadow dx="1" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.45)"/></filter>
    </defs>
    <g filter="url(#trainShadow)">
      <path d="M32 1C29 1 24 5 22 10L19 20L19 50C19 55 23 60 28 60L36 60C41 60 45 55 45 50L45 20L42 10C40 5 35 1 32 1Z" fill="url(#ttd)"/>
      <path d="M32 1C29 1 24 5 22 10L19 20L19 50C19 55 23 60 28 60L36 60C41 60 45 55 45 50L45 20L42 10C40 5 35 1 32 1Z" fill="url(#tshine)"/>
      <path d="M27 2L37 2L42 10L22 10Z" fill="url(#tnose)"/>
      <path d="M29 1L35 1L37 3L27 3Z" fill="rgba(255,255,255,0.6)"/>
      <rect x="24" y="5" width="16" height="4" rx="2" fill="url(#tglass)" stroke="rgba(200,220,200,0.3)" stroke-width="0.3"/>
      <path d="M25 5L39 5" stroke="rgba(255,255,255,0.5)" stroke-width="0.5"/>
      <circle cx="32" cy="13" r="3.5" fill="#facc15" stroke="rgba(234,179,8,0.5)" stroke-width="0.5"/><circle cx="32" cy="13" r="1.8" fill="#fef9c3"/>
      <rect x="19" y="18" width="26" height="1.5" rx="0.75" fill="rgba(255,255,255,0.3)"/>
      <rect x="23" y="22" width="7" height="9" rx="2" fill="url(#tglass)" stroke="rgba(200,220,200,0.2)" stroke-width="0.3"/><rect x="34" y="22" width="7" height="9" rx="2" fill="url(#tglass)" stroke="rgba(200,220,200,0.2)" stroke-width="0.3"/>
      <path d="M24 22L29 22" stroke="rgba(255,255,255,0.35)" stroke-width="0.4"/><path d="M35 22L40 22" stroke="rgba(255,255,255,0.35)" stroke-width="0.4"/>
      <rect x="19" y="34" width="26" height="1.5" rx="0.75" fill="rgba(255,255,255,0.2)"/>
      <rect x="23" y="38" width="7" height="9" rx="2" fill="url(#tglass)" opacity="0.8" stroke="rgba(200,220,200,0.15)" stroke-width="0.3"/><rect x="34" y="38" width="7" height="9" rx="2" fill="url(#tglass)" opacity="0.8" stroke="rgba(200,220,200,0.15)" stroke-width="0.3"/>
      <rect x="19" y="50" width="26" height="1.5" rx="0.75" fill="rgba(255,255,255,0.15)"/>
      <path d="M19 20L19 50" stroke="rgba(21,128,61,0.5)" stroke-width="2"/><path d="M45 20L45 50" stroke="rgba(21,128,61,0.5)" stroke-width="2"/>
      <path d="M22 20L22 50" stroke="rgba(255,255,255,0.12)" stroke-width="0.6"/><path d="M42 20L42 50" stroke="rgba(255,255,255,0.12)" stroke-width="0.6"/>
      <rect x="17" y="18" width="3.5" height="7" rx="1.75" fill="rgba(20,20,20,0.5)" stroke="rgba(100,100,100,0.2)" stroke-width="0.3"/><rect x="43.5" y="18" width="3.5" height="7" rx="1.75" fill="rgba(20,20,20,0.5)" stroke="rgba(100,100,100,0.2)" stroke-width="0.3"/>
      <rect x="17" y="40" width="3.5" height="7" rx="1.75" fill="rgba(20,20,20,0.5)" stroke="rgba(100,100,100,0.2)" stroke-width="0.3"/><rect x="43.5" y="40" width="3.5" height="7" rx="1.75" fill="rgba(20,20,20,0.5)" stroke="rgba(100,100,100,0.2)" stroke-width="0.3"/>
      <circle cx="28" cy="57" r="1.5" fill="#ef4444" opacity="0.7"/><circle cx="36" cy="57" r="1.5" fill="#ef4444" opacity="0.7"/>
      <circle cx="28" cy="57" r="0.7" fill="#fca5a5" opacity="0.5"/><circle cx="36" cy="57" r="0.7" fill="#fca5a5" opacity="0.5"/>
    </g>
  </svg>`,
  // Bus — 3D luxury coach inside circular orb, glossy metallic blue with reflections
  "🚌": `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="btd" x1="7" y1="1" x2="25" y2="31"><stop stop-color="#93c5fd"/><stop offset="0.3" stop-color="#3b82f6"/><stop offset="0.7" stop-color="#2563eb"/><stop offset="1" stop-color="#1e3a8a"/></linearGradient>
      <linearGradient id="bshine" x1="7" y1="1" x2="25" y2="31"><stop stop-color="rgba(255,255,255,0.45)"/><stop offset="0.2" stop-color="rgba(255,255,255,0.1)"/><stop offset="1" stop-color="rgba(0,0,0,0.1)"/></linearGradient>
      <linearGradient id="bglass" x1="9" y1="3" x2="23" y2="8"><stop stop-color="rgba(186,230,253,0.85)"/><stop offset="1" stop-color="rgba(96,165,250,0.7)"/></linearGradient>
    </defs>
    <path d="M16 1C13 1 9 2.5 8 5L7 9L7 25C7 27.5 9 30 12 30L20 30C23 30 25 27.5 25 25L25 9L24 5C23 2.5 19 1 16 1Z" fill="url(#btd)"/>
    <path d="M16 1C13 1 9 2.5 8 5L7 9L7 25C7 27.5 9 30 12 30L20 30C23 30 25 27.5 25 25L25 9L24 5C23 2.5 19 1 16 1Z" fill="url(#bshine)"/>
    <rect x="9" y="3.5" width="14" height="4.5" rx="1.5" fill="url(#bglass)" stroke="rgba(200,210,230,0.3)" stroke-width="0.2"/>
    <path d="M10 3.5L22 3.5" stroke="rgba(255,255,255,0.4)" stroke-width="0.3"/>
    <rect x="9" y="10" width="6" height="4" rx="1" fill="url(#bglass)" opacity="0.7"/><rect x="17" y="10" width="6" height="4" rx="1" fill="url(#bglass)" opacity="0.7"/>
    <rect x="9" y="16" width="6" height="4" rx="1" fill="url(#bglass)" opacity="0.6"/><rect x="17" y="16" width="6" height="4" rx="1" fill="url(#bglass)" opacity="0.6"/>
    <rect x="9" y="22" width="6" height="3.5" rx="1" fill="url(#bglass)" opacity="0.5"/><rect x="17" y="22" width="6" height="3.5" rx="1" fill="url(#bglass)" opacity="0.5"/>
    <rect x="5" y="7" width="3" height="4" rx="1.5" fill="rgba(20,20,20,0.5)"/><rect x="24" y="7" width="3" height="4" rx="1.5" fill="rgba(20,20,20,0.5)"/>
    <rect x="5" y="15" width="3" height="4" rx="1.5" fill="rgba(20,20,20,0.45)"/><rect x="24" y="15" width="3" height="4" rx="1.5" fill="rgba(20,20,20,0.45)"/>
    <rect x="5" y="22" width="3" height="4" rx="1.5" fill="rgba(20,20,20,0.4)"/><rect x="24" y="22" width="3" height="4" rx="1.5" fill="rgba(20,20,20,0.4)"/>
    <path d="M7 9L7 26" stroke="rgba(59,130,246,0.5)" stroke-width="1"/><path d="M25 9L25 26" stroke="rgba(59,130,246,0.5)" stroke-width="1"/>
  </svg>`,
};

// Rotate the inner SVG icon of a transport marker to face a heading
function rotateIconToHeading(marker: maplibregl.Marker, heading: number, mapBearing: number) {
  const icon = marker.getElement().querySelector(".transport-icon") as HTMLElement | null;
  if (!icon) return;
  const screenAngle = heading - mapBearing;
  icon.style.transform = `rotate(${screenAngle}deg)`;
}

// Color config per transport type for visual distinction
const TRANSPORT_COLORS: Record<string, { trail: string; glow: string }> = {
  "✈️": { trail: "rgba(140,190,255,0.8)", glow: "rgba(100,160,255,0.4)" },
  "🚗": { trail: "rgba(239,68,68,0.5)", glow: "rgba(239,68,68,0.2)" },
  "🚂": { trail: "rgba(16,185,129,0.5)", glow: "rgba(16,185,129,0.2)" },
  "🚌": { trail: "rgba(59,130,246,0.6)", glow: "rgba(59,130,246,0.3)" },
  "⛴️": { trail: "rgba(100,116,139,0.4)", glow: "rgba(100,116,139,0.15)" },
  "🚡": { trail: "rgba(239,68,68,0.4)", glow: "rgba(239,68,68,0.15)" },
};

// Build a 3D transport marker with SVG vehicle icon, shadow, and glow
function createTransportEl(emoji: string): HTMLDivElement {
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
    svgWrap.innerHTML = VEHICLE_SVG[emoji];
    const svgEl = svgWrap.querySelector("svg");
    if (svgEl) svgEl.style.cssText = "width:100%;height:100%;display:block;";
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
    circle.innerHTML = VEHICLE_SVG[emoji];
    const svgEl = circle.querySelector("svg");
    if (svgEl) svgEl.style.cssText = "width:100%;height:100%;display:block;";
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
  const svgMarkup = VEHICLE_SVG[emoji];
  if (svgMarkup) {
    svgWrap.innerHTML = svgMarkup;
    const svgEl = svgWrap.querySelector("svg");
    if (svgEl) svgEl.style.cssText = "width:100%;height:100%;display:block;";
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

function removeTransportMarker(marker: maplibregl.Marker) {
  const el = marker.getElement();
  // Shrink contrail first for planes
  const trails = el.querySelectorAll(".plane-contrail, .plane-contrail-glow");
  trails.forEach((t) => { (t as HTMLElement).style.height = "0px"; });
  el.style.transform = "scale(0)";
  el.style.opacity = "0";
  el.style.transition = "transform 0.35s ease-in, opacity 0.35s ease-in";
  setTimeout(() => marker.remove(), 400);
}

function bezierPt(p0: [number, number], p1: [number, number], p2: [number, number], t: number): [number, number] {
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
function rafAnimate(
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

function calcBearing(from: [number, number], to: [number, number]): number {
  const toRad = Math.PI / 180;
  const dLng = (to[0] - from[0]) * toRad;
  const lat1 = from[1] * toRad;
  const lat2 = to[1] * toRad;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// ─── Map layer IDs ────────────────────────────────────────────────────────────

const SRC_DONE    = "cinematic-route-done";
const SRC_CURRENT = "cinematic-route-current";
const LYR_DONE    = "cinematic-route-done";
const LYR_CURRENT = "cinematic-route-current";
const LYR_TRACKS  = "cinematic-route-tracks";     // railroad tracks overlay
const LYR_TRACKS_TIES = "cinematic-route-ties";   // cross ties for railroad

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  plan: TripPlan;
  country: Country;
  homeCountry: string;
  mainMapRef?: RefObject<maplibregl.Map | null>;
  rule?: CountryRule | null;
  comboCountries?: Array<{ name: string; lat: number; lng: number }>;
  onClose: () => void;
}

type Phase = "intro" | "city" | "done";

export default function ItineraryCinematic({ plan, country, homeCountry, mainMapRef, rule, comboCountries, onClose }: Props) {
  // Reduced-motion: show static itinerary summary instead of fly-through
  const prefersReducedMotion = typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const cityStopsStatic = prefersReducedMotion ? buildCityStops(plan, country, rule) : [];

  if (prefersReducedMotion) {
    return createPortal(
      <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 dark:text-white">🎬 {country.name} — Itinerary Overview</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl leading-none focus-ring rounded p-1" aria-label="Close">✕</button>
          </div>
          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <p className="text-xs text-slate-500 dark:text-slate-400">Animated fly-through disabled (reduced-motion preference). Here's your route:</p>
            {cityStopsStatic.map((stop, i) => (
              <div key={stop.name} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 dark:text-white">{stop.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{stop.days.length} day{stop.days.length > 1 ? "s" : ""}</div>
                  {stop.transportToNext && (
                    <div className="text-[10px] text-slate-400 mt-1">→ {stop.transportToNext.label}</div>
                  )}
                </div>
              </div>
            ))}
            {cityStopsStatic.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No city route data available for this plan.</p>
            )}
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
            <button onClick={onClose} className="px-5 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus-ring">Close</button>
          </div>
        </div>
      </div>,
      document.body
    );
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

  const [cityStops]      = useState<CityStop[]>(() => buildCityStops(plan, country, rule));
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
    const homeCoords = HOME_COORDS[homeCountry] ?? [20, 20];
    const homeCity   = HOME_CITY[homeCountry]   ?? homeCountry;

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
        el.style.cssText = "width:10px;height:10px;background:white;border:2.5px solid #94a3b8;border-radius:50%;transition:all 0.6s ease;box-sizing:border-box;pointer-events:none;opacity:0;transform:scale(0);";
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
      const midLng = (homeCoords[0] + country.lng) / 2;
      const midLat = (homeCoords[1] + country.lat) / 2;
      setStatusMsg(`${homeCity} → ${country.name}`);
      await flyAndWait({ center: [midLng, midLat], zoom: 1.8, duration: 1800 });
      if (cancelled) return;
      await waitForIdle();
      await sleep(500);

      // Show trip summary while photos are fetched
      const comboLine = comboCountries?.length
        ? ` · also pairs with ${comboCountries.map((c) => c.name).join(", ")}`
        : "";
      setStatusMsg(`${plan.duration} · ${plan.costPerPerson} ${planCostBasisIcon(plan)}${comboLine}`);

      // Pre-fetch city images during overview hold (parallel, with timeout)
      // rule passed as prop
      const cityImgKeys = rule?.cityImages ?? {};
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

      // ── Fly into home country ──────────────────────────────────────────────
      setStatusMsg(`Starting in ${homeCity}…`);
      await flyAndWait({ center: homeCoords, zoom: 4, duration: 1600 });
      if (cancelled) return;
      await waitForIdle();
      await sleep(500);

      // ── Departure arc: home → first city ──────────────────────────────────
      const completedCoords: [number, number][] = [homeCoords];
      const firstStop = cityStops[0];
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
          dotEl.style.cssText = "width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.35);transition:all 0.5s ease;box-sizing:border-box;pointer-events:none;animation:cityPulse 0.6s ease-out;";
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

      // ── Return arc: last city → home ────────────────────────────────────────
      const lastStop = cityStops[cityStops.length - 1];
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
        <div className={`${isMobile ? "px-4 pt-0 pb-2" : "px-5 pt-5 pb-4"} border-b border-white/10 shrink-0`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className={`${isMobile ? "text-base" : "text-xl"} font-black truncate`}>{country.name}</h2>
                <span className="text-[10px] text-gray-400 shrink-0">{plan.duration}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={cycleSpeed}
                className="text-gray-300 hover:text-white hover:bg-white/10 h-8 min-w-[36px] px-1.5 flex items-center justify-center rounded-lg transition-colors text-xs font-bold tabular-nums focus-ring"
                title="Playback speed"
                aria-label={`Playback speed ${speed}×`}
              >{speed}×</button>
              <button
                onClick={prevStep}
                disabled={activeCityIdx <= 0}
                className="text-gray-400 hover:text-white hover:bg-white/10 w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-sm focus-ring disabled:opacity-30 disabled:cursor-not-allowed"
                title="Back to previous stop"
                aria-label="Back to previous stop"
              >⏮</button>
              <button
                onClick={() => setPaused((p) => !p)}
                className="text-gray-400 hover:text-white hover:bg-white/10 w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-sm focus-ring"
                title="Pause / Resume"
                aria-label={paused ? "Resume" : "Pause"}
              >⏯</button>
              <button
                onClick={skipStep}
                className="text-gray-400 hover:text-white hover:bg-white/10 w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-sm focus-ring"
                title="Skip to next stop"
                aria-label="Skip to next stop"
              >⏭</button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white hover:bg-white/10 w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-sm focus-ring"
                aria-label="Close"
              >✕</button>
            </div>
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
              <span className="text-6xl" style={{ animation: "pulse 2s ease-in-out infinite" }}>🌍</span>
              <div>
                <p className="text-base font-bold text-white">{HOME_CITY[homeCountry] ?? homeCountry}</p>
                <p className="text-[11px] text-gray-600 -mt-0.5">{homeCountry}</p>
                <p className="text-gray-500 text-sm mt-2">✈</p>
                <p className="text-base font-bold text-white mt-2">{country.name}</p>
              </div>
              <p className="text-[11px] text-gray-400">{plan.duration} · {plan.costPerPerson} {planCostBasisIcon(plan)}</p>
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
              <div className="flex items-center gap-2 mt-1">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-blue-400"
                      style={{
                        animation: "pulse 1.2s ease-in-out infinite",
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500">{statusMsg}</p>
              </div>
              {!mapAvailable && (
                <p className="text-xs text-amber-400 mt-2">⚠ Switch to Map view to start the cinematic journey</p>
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
              <p className="text-xs text-gray-400">{plan.duration} · {plan.costPerPerson} {planCostBasisIcon(plan)}</p>
              <div className="mt-3 text-[11px] text-gray-500 leading-relaxed text-left bg-white/5 rounded-xl px-4 py-3">
                {plan.note}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={prevStep}
              disabled={activeCityIdx <= 0}
              className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-sm font-bold transition-colors focus-ring disabled:opacity-30 disabled:cursor-not-allowed"
              title="Back to previous stop"
              aria-label="Back to previous stop"
            >
              ⏮
            </button>
            <button
              onClick={() => setPaused((p) => !p)}
              className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-sm font-bold transition-colors focus-ring"
              title={paused ? "Resume" : "Pause"}
              aria-label={paused ? "Resume" : "Pause"}
            >
              {paused ? "▶" : "⏸"}
            </button>
            <button
              onClick={skipStep}
              className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-sm font-bold transition-colors focus-ring"
              title="Skip to next stop"
              aria-label="Skip to next stop"
            >
              ⏭
            </button>
            <button
              onClick={cycleSpeed}
              className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold transition-colors tabular-nums focus-ring"
              title="Playback speed"
              aria-label={`Playback speed ${speed}×`}
            >
              {speed}×
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-sm font-bold transition-colors text-gray-400 hover:text-white focus-ring"
            title="Close"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
