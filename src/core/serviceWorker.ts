// PWA service-worker lifecycle. Kept out of main.tsx so it is unit-testable
// and main stays a thin entry point (Single Responsibility).

const SW_URL = `${import.meta.env.BASE_URL}sw.js`;

/**
 * Removes any installed service worker and purges its caches. Best-effort:
 * failures are swallowed so a flaky cache API can never break boot.
 */
export async function unregisterServiceWorkers(): Promise<void> {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((reg) => reg.unregister()));
    if ("caches" in globalThis) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // Best-effort cleanup — ignore.
  }
}

/**
 * Auto-reload the page once a newly-installed worker takes control, so a fresh
 * deploy is applied without a manual cache clear. Only armed when the page is
 * already controlled (an update), never on the very first install — that would
 * reload every first visit for no benefit. A latch prevents reload loops.
 */
function reloadOnWorkerActivation(): void {
  if (!navigator.serviceWorker.controller) return;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}

/**
 * Registers the service worker in production only.
 *
 * In dev we must NOT register it: a cache-first worker shadows the Vite dev
 * server, breaking HMR and serving stale modules/data. Instead we tear down
 * any worker left over from a prior prod build so localhost is always fresh.
 */
export function initServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;

  if (import.meta.env.PROD) {
    reloadOnWorkerActivation();
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register(SW_URL)
        .then((reg) => {
          // Long-lived tabs won't navigate for hours; re-check for a new
          // deploy whenever the tab regains focus so updates land promptly.
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") void reg.update();
          });
        })
        .catch(() => {
          // Registration failed — app still works without offline support.
        });
    });
    return;
  }

  void unregisterServiceWorkers();
}
