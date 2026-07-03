export function setHashRoute(view: "trips" | "calendar" | "discover") {
  window.history.pushState(null, "", `#${view}`);
}

