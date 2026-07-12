// Roamwise Service Worker — cache-first for immutable hashed build assets,
// network-first for navigations and unhashed assets (manifest, icons, data).
const CACHE_NAME = "roamwise-v5";

// Base path is derived from the worker's own URL (…/sw.js) so this file stays
// in sync with Vite's `base` without a duplicated string literal.
const BASE = self.location.pathname.replace(/sw\.js$/, "");
const OFFLINE_URL = `${BASE}index.html`;

// Assets to pre-cache on install (shell)
const SHELL_ASSETS = [
  BASE,
  OFFLINE_URL,
  `${BASE}manifest.json`,
  `${BASE}icon-192.png`,
  `${BASE}icon-512.png`,
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

// Store a copy in the cache without blocking the response. Only successful,
// basic/cors responses are cached (never opaque errors or partial 206s).
function putInCache(request, response) {
  if (!response || !response.ok) return;
  const clone = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
}

// Network-first: fresh when online, cached when offline, and a synthetic 504
// as a last resort so respondWith always receives a valid Response.
async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetch(request);
    putInCache(request, response);
    return response;
  } catch {
    const cached =
      (await caches.match(request)) ||
      (fallbackUrl ? await caches.match(fallbackUrl) : undefined);
    return cached || Response.error();
  }
}

// Cache-first: serve immutable hashed assets from cache, fetch + store on miss.
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    putInCache(request, response);
    return response;
  } catch {
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET, cross-origin, and chrome-extension requests
  if (event.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Navigation requests (HTML pages) — network first, fall back to app shell.
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, OFFLINE_URL));
    return;
  }

  // Immutable, content-hashed build assets — Vite emits ONLY hashed output
  // under /assets/, so cache-first is safe (a content change yields a new URL).
  if (url.pathname.includes("/assets/")) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Everything else same-origin (unhashed assets: manifest.json, icons, and
  // any data/*.json fetched at runtime) — network-first so edits reflect
  // without a cache bump, falling back to cache when offline.
  event.respondWith(networkFirst(event.request));
});
