import { useState, useEffect } from "react";
import maplibregl from "maplibre-gl";
import type { Country } from "../types";

const INDIA: [number, number] = [77.209, 28.614]; // New Delhi

type Point = { x: number; y: number };

function arc(a: Point, b: Point): string {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2 - dist * 0.28;
  return `M ${a.x},${a.y} Q ${cx},${cy} ${b.x},${b.y}`;
}

type Props = {
  map: maplibregl.Map | null;
  selectedCountry: Country | null;
  allCountries: Country[];
};

export default function FlightRoutes({ map, selectedCountry, allCountries }: Props) {
  const [pts, setPts] = useState<Record<string, Point>>({});

  useEffect(() => {
    if (!map || !selectedCountry) { setPts({}); return; }

    function project() {
      const next: Record<string, Point> = {};
      const p0 = map!.project(INDIA);
      next["_india"] = { x: p0.x, y: p0.y };

      const p1 = map!.project([selectedCountry!.lng, selectedCountry!.lat]);
      next[selectedCountry!.name] = { x: p1.x, y: p1.y };

      selectedCountry!.combo?.forEach((name) => {
        const c = allCountries.find((x) => x.name === name);
        if (c) {
          const p = map!.project([c.lng, c.lat]);
          next[name] = { x: p.x, y: p.y };
        }
      });

      setPts(next);
    }

    project();
    map.on("move", project);
    return () => { map.off("move", project); };
  }, [map, selectedCountry, allCountries]);

  if (!selectedCountry) return null;

  const india = pts["_india"];
  const dest = pts[selectedCountry.name];
  if (!india || !dest) return null;

  const mainPath = arc(india, dest);

  const combos = (selectedCountry.combo ?? [])
    .map((name) => ({ name, pt: pts[name] }))
    .filter((c): c is { name: string; pt: Point } => c.pt != null);

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 25 }}
    >
      {/* Onward routes: destination → combo countries */}
      {combos.map(({ name, pt }, i) => {
        const d = arc(dest, pt);
        return (
          <g key={name}>
            <path d={d} fill="none" stroke="#7c3aed" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.35} />
            {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
            {/* @ts-ignore — animateMotion path is valid SMIL but not always typed */}
            <text textAnchor="middle" dominantBaseline="central" fontSize="11" opacity={0.5} style={{ userSelect: "none" }}>
              ✈
              {/* @ts-ignore */}
              <animateMotion dur={`${3.5 + i * 0.8}s`} repeatCount="indefinite" rotate="auto" path={d} />
            </text>
          </g>
        );
      })}

      {/* Main route: India → destination */}
      <path
        d={mainPath}
        fill="none"
        stroke="#2563eb"
        strokeWidth={2}
        strokeDasharray="7 4"
        opacity={0.6}
      />

      {/* India origin — pulsing dot */}
      <circle cx={india.x} cy={india.y} r={5} fill="#2563eb" opacity={0.9} />
      <circle cx={india.x} cy={india.y} r={5} fill="none" stroke="#2563eb" strokeWidth={8} opacity={0}>
        <animate attributeName="r" from="5" to="18" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* India label */}
      <text
        x={india.x}
        y={india.y + 16}
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill="#2563eb"
        opacity={0.7}
        style={{ userSelect: "none", letterSpacing: "0.05em" }}
      >
        INDIA
      </text>

      {/* Animated plane — main route */}
      {/* @ts-ignore */}
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="18"
        style={{ userSelect: "none", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.35))" }}
      >
        ✈
        {/* @ts-ignore */}
        <animateMotion dur="5s" repeatCount="indefinite" rotate="auto" path={mainPath} />
      </text>
    </svg>
  );
}
