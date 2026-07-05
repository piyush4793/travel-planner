import { useState, useEffect, useCallback } from "react";
import { appUrl } from "../core/utils/appUrl";

/**
 * Hook to capture the browser's `beforeinstallprompt` event and expose
 * a callable `promptInstall()` function. Works on Chrome/Edge (desktop + Android).
 * iOS Safari doesn't fire this event — use `isIOS` to show manual instructions.
 *
 * Once the PWA is installed, `beforeinstallprompt` no longer fires in a browser
 * tab, so we additionally probe `navigator.getInstalledRelatedApps()` (Chromium)
 * to detect an already-installed app and offer an "Open app" affordance instead.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface RelatedApplication {
  platform: string;
  url?: string;
  id?: string;
}

type NavigatorWithRelatedApps = Navigator & {
  getInstalledRelatedApps?: () => Promise<RelatedApplication[]>;
};

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installedInBrowser, setInstalledInBrowser] = useState(false);

  useEffect(() => {
    // Check if already installed as standalone PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // In a browser tab, detect whether the PWA is already installed so we can
    // offer "Open app" rather than a redundant "Install" prompt.
    let cancelled = false;
    const nav = navigator as NavigatorWithRelatedApps;
    if (typeof nav.getInstalledRelatedApps === "function") {
      nav
        .getInstalledRelatedApps()
        .then((apps) => {
          if (!cancelled) setInstalledInBrowser(apps.some((a) => a.platform === "webapp"));
        })
        .catch(() => {
          /* unsupported or blocked — keep the default install path */
        });
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Detect when app gets installed
    const installedHandler = () => {
      setIsInstalled(true);
      setInstalledInBrowser(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") setIsInstalled(true);
    return outcome === "accepted";
  }, [deferredPrompt]);

  // Best-effort launch of the installed app. Browsers don't expose a direct
  // "launch installed PWA" API, but opening the in-scope start URL lets Chromium
  // route to (and focus) the app window via `launch_handler`/link capturing.
  const openApp = useCallback(() => {
    const url = appUrl();
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const canPrompt = deferredPrompt !== null && !isInstalled;
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

  return { canPrompt, isInstalled, installedInBrowser, isIOS, promptInstall, openApp };
}
