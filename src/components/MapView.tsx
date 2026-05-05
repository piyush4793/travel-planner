import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Country } from "../types";
import HoverCard from "./HoverCard";
import FlightRoutes from "./FlightRoutes";

type Props = {
  countries: Country[];
  allCountries: Country[];
  onSelect: (c: Country) => void;
  highlightedNames?: string[];
  visitedNames?: Set<string>;
  selectedCountry?: Country | null;
};

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

type HoverState = { country: Country; x: number; y: number } | null;

export default function MapView({
  countries,
  allCountries,
  onSelect,
  highlightedNames = [],
  visitedNames = new Set(),
  selectedCountry = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  const [hovered, setHovered] = useState<HoverState>(null);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);

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
    mapRef.current = map;
    setMapInstance(map);
    return () => { map.remove(); mapRef.current = null; setMapInstance(null); };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const addMarkers = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      countries.forEach((country) => {
        const isVisited = visitedNames.has(country.name);
        const isCombo = highlightedNames.includes(country.name);
        const el = document.createElement("div");
        el.className = [
          "travel-marker",
          isVisited ? "travel-marker--visited" : "",
          isCombo ? "travel-marker--combo" : "",
        ].filter(Boolean).join(" ");
        el.innerHTML = `<span>${country.name[0]}</span>`;
        el.title = country.name;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([country.lng, country.lat])
          .addTo(map);

        el.addEventListener("click", () => onSelectRef.current(country));

        el.addEventListener("mouseenter", () => {
          if (!containerRef.current) return;
          const cRect = containerRef.current.getBoundingClientRect();
          const eRect = el.getBoundingClientRect();
          setHovered({
            country,
            x: eRect.left - cRect.left + eRect.width / 2,
            y: eRect.top - cRect.top,
          });
        });
        el.addEventListener("mouseleave", () => setHovered(null));

        markersRef.current.push(marker);
      });
    };

    if (map.isStyleLoaded()) addMarkers();
    else map.once("load", addMarkers);
  }, [countries, highlightedNames, visitedNames]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {hovered && (
        <HoverCard
          country={hovered.country}
          x={hovered.x}
          y={hovered.y}
          isVisited={visitedNames.has(hovered.country.name)}
        />
      )}
      <FlightRoutes
        map={mapInstance}
        selectedCountry={selectedCountry}
        allCountries={allCountries}
      />
    </div>
  );
}
