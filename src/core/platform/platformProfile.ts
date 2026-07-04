/**
 * Platform capability detection.
 *
 * This app is a single PWA, so "platform" is modelled as runtime *capabilities*
 * (which web APIs are available) plus a coarse OS / form-factor, rather than a
 * hard desktop-vs-mobile fork. `detectPlatformProfile` is pure and unit-tested;
 * `getPlatformProfile` memoises it against the real browser globals.
 */

export type PlatformOS = "windows" | "macos" | "ios" | "android" | "linux" | "unknown";
export type FormFactor = "desktop" | "mobile";
export type PlatformSurface = "browser" | "standalone";

export interface PlatformCapabilities {
  /** File System Access API (showDirectoryPicker) — desktop Chrome/Edge, some Android. */
  fileSystemAccess: boolean;
  /** Origin Private File System — silent app-private storage (most modern browsers). */
  opfs: boolean;
  /** Web Share API can share files (mostly mobile, also desktop Chrome). */
  shareFiles: boolean;
  /** navigator.storage.persist() — protects data from eviction. */
  persistentStorage: boolean;
}

export interface PlatformProfile {
  os: PlatformOS;
  formFactor: FormFactor;
  surface: PlatformSurface;
  capabilities: PlatformCapabilities;
}

/** Raw inputs for detection — injected so the logic stays pure and testable. */
export interface PlatformEnv {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  standalone: boolean;
  capabilities: PlatformCapabilities;
}

function detectOS(ua: string, platform: string, maxTouchPoints: number): PlatformOS {
  const s = `${ua} ${platform}`.toLowerCase();
  const isMacLike = /macintosh|mac os x|macintel|macppc/.test(s);
  if (/iphone|ipad|ipod/.test(s)) return "ios";
  if (/android/.test(s)) return "android";
  // iPadOS 13+ reports a desktop Safari UA but exposes touch points.
  if (isMacLike && maxTouchPoints > 1) return "ios";
  if (/windows|win32|win64/.test(s)) return "windows";
  if (isMacLike) return "macos";
  if (/linux|cros/.test(s)) return "linux";
  return "unknown";
}

/** Pure detection from injected environment inputs. */
export function detectPlatformProfile(env: PlatformEnv): PlatformProfile {
  const os = detectOS(env.userAgent, env.platform, env.maxTouchPoints);
  const formFactor: FormFactor = os === "ios" || os === "android" ? "mobile" : "desktop";
  return {
    os,
    formFactor,
    surface: env.standalone ? "standalone" : "browser",
    capabilities: env.capabilities,
  };
}

function readCapabilities(): PlatformCapabilities {
  const hasWindow = typeof window !== "undefined";
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  const storage = nav?.storage as StorageManager | undefined;
  return {
    fileSystemAccess: hasWindow && "showDirectoryPicker" in window,
    opfs: !!storage && typeof storage.getDirectory === "function",
    shareFiles: !!nav && typeof nav.canShare === "function",
    persistentStorage: !!storage && typeof storage.persist === "function",
  };
}

function readStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const displayStandalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  // iOS Safari exposes a non-standard navigator.standalone.
  const iosStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
  return displayStandalone || iosStandalone;
}

/** Read the real browser environment (guarded for non-browser/test contexts). */
export function readPlatformEnv(): PlatformEnv {
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  const uaData = (nav as unknown as { userAgentData?: { platform?: string } })?.userAgentData;
  return {
    userAgent: nav?.userAgent ?? "",
    platform: uaData?.platform ?? (nav as unknown as { platform?: string })?.platform ?? "",
    maxTouchPoints: nav?.maxTouchPoints ?? 0,
    standalone: readStandalone(),
    capabilities: readCapabilities(),
  };
}

let cached: PlatformProfile | null = null;

/** Memoised profile for the running app. */
export function getPlatformProfile(): PlatformProfile {
  if (!cached) cached = detectPlatformProfile(readPlatformEnv());
  return cached;
}
