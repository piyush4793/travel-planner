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
 * Registers the service worker in production only.
 *
 * In dev we must NOT register it: a cache-first worker shadows the Vite dev
 * server, breaking HMR and serving stale modules/data. Instead we tear down
 * any worker left over from a prior prod build so localhost is always fresh.
 */
export function initServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;

  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register(SW_URL).catch(() => {
        // Registration failed — app still works without offline support.
      });
    });
    return;
  }

  void unregisterServiceWorkers();
}
