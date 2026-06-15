// Roamwise Service Worker — cache-first for assets, network-first for navigation
const CACHE_NAME = "roamwise-v1";

// Assets to pre-cache on install (shell)
const SHELL_ASSETS = [
  "/travel-planner/",
  "/travel-planner/index.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET, cross-origin, and chrome-extension requests
  if (event.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Navigation requests (HTML pages) — network first, fall back to cache
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match("/travel-planner/index.html"))
    );
    return;
  }

  // JS/CSS/SVG/font assets — cache first (hashed filenames = immutable)
  if (
    url.pathname.match(/\.(js|css|svg|woff2?|ttf|eot|ico|png|jpg|webp|json)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else — network with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
