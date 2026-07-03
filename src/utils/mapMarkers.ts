// Pure, unit-testable helpers behind MapView's imperative MapLibre setup.
//
// MapView itself can't run in jsdom (WebGL/canvas is unavailable), so the parts
// that don't need a live map — marker element construction and hover geometry —
// live here where they can be tested in isolation.

type RectLike = { left: number; top: number; width: number };

// Compose the marker element's class list from destination state.
export function markerClassName(isVisited: boolean, isCombo: boolean): string {
  return [
    "travel-marker",
    isVisited ? "travel-marker--visited" : "",
    isCombo ? "travel-marker--combo" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

// Build an accessible marker element: a single-letter label inside a
// keyboard-focusable button role, labelled by the destination name.
export function buildMarkerElement(
  name: string,
  opts: { isVisited: boolean; isCombo: boolean },
): HTMLDivElement {
  const el = document.createElement("div");
  el.className = markerClassName(opts.isVisited, opts.isCombo);
  const label = document.createElement("span");
  label.textContent = name[0] ?? "";
  el.replaceChildren(label);
  el.setAttribute("role", "button");
  el.setAttribute("tabindex", "0");
  el.setAttribute("aria-label", name);
  return el;
}

// Position a hover card at the horizontal center / top edge of a marker,
// relative to the map container's origin.
export function computeHoverPosition(container: RectLike, marker: RectLike & { top: number }): { x: number; y: number } {
  return {
    x: marker.left - container.left + marker.width / 2,
    y: marker.top - container.top,
  };
}
