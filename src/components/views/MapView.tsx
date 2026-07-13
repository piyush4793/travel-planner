import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Country } from "../../core/types";
import HoverCard from "../map/HoverCard";
import { buildMarkerElement, computeHoverPosition } from "../../utils/mapMarkers";

type Props = {
  countries: Country[];
  onSelect?: (c: Country) => void;
  highlightedNames?: string[];
  onMapReady?: (map: maplibregl.Map | null) => void;
};

// Carto Voyager — free, no API key, reliable CORS
// OpenFreeMap (tiles.openfreemap.org) was primary but has intermittent CORS/403 issues
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

type HoverState = { country: Country; x: number; y: number } | null;

// Stable empty default so omitting `highlightedNames` doesn't hand the marker
// effect a fresh array reference on every render (which would rebuild all markers).
const NO_HIGHLIGHTS: string[] = [];

export default function MapView({
  countries,
  onSelect,
  highlightedNames = NO_HIGHLIGHTS,
  onMapReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  const [hovered, setHovered] = useState<HoverState>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [20, 20],
      zoom: 1.8,
    });
    map.addControl(new maplibregl.NavigationControl(), "bottom-right");
    map.on("movestart", () => setHovered(null));

    // Remove any cinematic GeoJSON sources left behind by a previous session
    const purgeCinematicSources = () => {
      const EMPTY = { type: "FeatureCollection" as const, features: [] };
      ["cinematic-route-done", "cinematic-route-current"].forEach((id) => {
        try {
          if (map.getSource(id)) (map.getSource(id) as maplibregl.GeoJSONSource).setData(EMPTY);
          if (map.getLayer(id)) map.removeLayer(id);
          if (map.getSource(id)) map.removeSource(id);
        } catch { /* already removed */ }
      });
    };
    if (map.isStyleLoaded()) purgeCinematicSources();
    else map.once("load", purgeCinematicSources);

    mapRef.current = map;
    onMapReady?.(map);
    return () => { map.remove(); mapRef.current = null; onMapReady?.(null); };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const controller = new AbortController();
    const { signal } = controller;

    const addMarkers = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      countries.forEach((country) => {
        const isCombo = highlightedNames.includes(country.name);
        const el = buildMarkerElement(country.name, { isCombo });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([country.lng, country.lat])
          .addTo(map);

        el.addEventListener("click", () => onSelectRef.current?.(country), { signal });
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelectRef.current?.(country);
          }
        }, { signal });

        const showHover = () => {
          if (!containerRef.current) return;
          const cRect = containerRef.current.getBoundingClientRect();
          const eRect = el.getBoundingClientRect();
          setHovered({ country, ...computeHoverPosition(cRect, eRect) });
        };
        const hideHover = () => setHovered(null);
        // Pointer + keyboard parity: focus/blur mirror mouseenter/mouseleave so
        // keyboard users tabbing between markers get the same preview card.
        el.addEventListener("mouseenter", showHover, { signal });
        el.addEventListener("mouseleave", hideHover, { signal });
        el.addEventListener("focus", showHover, { signal });
        el.addEventListener("blur", hideHover, { signal });

        markersRef.current.push(marker);
      });
    };

    if (map.isStyleLoaded()) addMarkers();
    else map.once("load", addMarkers);

    return () => {
      controller.abort();
      map.off("load", addMarkers);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [countries, highlightedNames]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {hovered && (
        <HoverCard
          country={hovered.country}
          x={hovered.x}
          y={hovered.y}
        />
      )}
    </div>
  );
}
