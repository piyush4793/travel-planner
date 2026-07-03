// SVG vehicle assets + a DOM-node builder for cinematic transport markers.
//
// The SVG strings are trusted, static, developer-authored constants (no user
// data). Historically they were injected via `el.innerHTML = VEHICLE_SVG[...]`.
// `buildVehicleSvgNode` parses each string once into a live SVG node and clones
// it on demand, removing the innerHTML sink entirely while avoiding repeated
// parsing when many markers of the same type are on the map.

// Top-down / bird's-eye vehicle silhouettes — pointing UP (north) by default.
// Flights rotate to follow arc heading; ground vehicles stay fixed.
export const VEHICLE_SVG: Record<string, string> = {
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
    </g>
  </svg>`,
  // Train — sleek high-speed locomotive nose, top-down
  "🚂": `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="ttd" x1="20" y1="4" x2="44" y2="60"><stop stop-color="#6ee7b7"/><stop offset="0.4" stop-color="#10b981"/><stop offset="0.8" stop-color="#047857"/><stop offset="1" stop-color="#064e3b"/></linearGradient>
      <linearGradient id="tshine" x1="20" y1="4" x2="44" y2="60"><stop stop-color="rgba(255,255,255,0.5)"/><stop offset="0.3" stop-color="rgba(255,255,255,0.05)"/><stop offset="1" stop-color="rgba(0,0,0,0.1)"/></linearGradient>
      <linearGradient id="tglass" x1="24" y1="8" x2="40" y2="14"><stop stop-color="rgba(147,197,253,0.85)"/><stop offset="1" stop-color="rgba(59,130,246,0.7)"/></linearGradient>
      <filter id="trainShadow" x="-25%" y="-15%" width="150%" height="140%"><feDropShadow dx="1" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.4)"/></filter>
    </defs>
    <g filter="url(#trainShadow)">
      <path d="M32 4C28 4 22 8 20 14L18 22L18 50C18 54 21 58 26 58L38 58C43 58 46 54 46 50L46 22L44 14C42 8 36 4 32 4Z" fill="url(#ttd)"/>
      <path d="M32 4C28 4 22 8 20 14L18 22L18 50C18 54 21 58 26 58L38 58C43 58 46 54 46 50L46 22L44 14C42 8 36 4 32 4Z" fill="url(#tshine)"/>
      <path d="M25 11L39 11L42 16L41 20L23 20L22 16Z" fill="url(#tglass)" stroke="rgba(200,210,230,0.3)" stroke-width="0.3"/>
      <rect x="22" y="26" width="20" height="6" rx="2" fill="rgba(255,255,255,0.15)"/>
      <rect x="22" y="36" width="20" height="6" rx="2" fill="rgba(255,255,255,0.12)"/>
      <rect x="22" y="46" width="20" height="6" rx="2" fill="rgba(255,255,255,0.1)"/>
    </g>
  </svg>`,
  // Bus — top-down coach with window rows and wheels
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

// Color config per transport type for visual distinction (motion trails/glow).
export const TRANSPORT_COLORS: Record<string, { trail: string; glow: string }> = {
  "✈️": { trail: "rgba(140,190,255,0.8)", glow: "rgba(100,160,255,0.4)" },
  "🚗": { trail: "rgba(239,68,68,0.5)", glow: "rgba(239,68,68,0.2)" },
  "🚂": { trail: "rgba(16,185,129,0.5)", glow: "rgba(16,185,129,0.2)" },
  "🚌": { trail: "rgba(59,130,246,0.6)", glow: "rgba(59,130,246,0.3)" },
  "⛴️": { trail: "rgba(100,116,139,0.4)", glow: "rgba(100,116,139,0.15)" },
  "🚡": { trail: "rgba(239,68,68,0.4)", glow: "rgba(239,68,68,0.15)" },
};

// Parsed-template cache keyed by markup string. A `null` value marks markup that
// failed to parse so we don't re-attempt (and callers fall back to an emoji).
const templateCache = new Map<string, SVGSVGElement | null>();

function parseSvgTemplate(markup: string): SVGSVGElement | null {
  if (!templateCache.has(markup)) {
    let parsed: SVGSVGElement | null = null;
    try {
      const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
      const hasError = doc.querySelector("parsererror");
      const svg = doc.querySelector("svg");
      if (!hasError && svg) parsed = svg as unknown as SVGSVGElement;
    } catch {
      parsed = null;
    }
    templateCache.set(markup, parsed);
  }
  const tmpl = templateCache.get(markup) ?? null;
  return tmpl ? (tmpl.cloneNode(true) as SVGSVGElement) : null;
}

// Build a live, sized <svg> node from a trusted static markup string.
// Returns null for missing/malformed markup so callers can fall back.
export function buildVehicleSvgNode(markup: string | undefined): SVGSVGElement | null {
  if (!markup) return null;
  const svg = parseSvgTemplate(markup);
  if (svg) svg.style.cssText = "width:100%;height:100%;display:block;";
  return svg;
}
