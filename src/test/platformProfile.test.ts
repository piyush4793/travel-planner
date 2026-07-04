import { describe, it, expect } from "vitest";
import { detectPlatformProfile, getPlatformProfile, readPlatformEnv, type PlatformCapabilities, type PlatformEnv } from "../core/platform/platformProfile";
import { resolvePlatformDefaults } from "../core/platform/defaults";

const CAPS = (over: Partial<PlatformCapabilities> = {}): PlatformCapabilities => ({
  fileSystemAccess: false,
  opfs: false,
  shareFiles: false,
  persistentStorage: false,
  ...over,
});

const env = (over: Partial<PlatformEnv>): PlatformEnv => ({
  userAgent: "",
  platform: "",
  maxTouchPoints: 0,
  standalone: false,
  capabilities: CAPS(),
  ...over,
});

const UA = {
  windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120",
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605 Safari",
  ipadOS: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605 Safari", // iPadOS masquerades as Mac
  android: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile",
  linux: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120",
};

describe("detectPlatformProfile — OS + form factor", () => {
  it("detects Windows desktop", () => {
    const p = detectPlatformProfile(env({ userAgent: UA.windows }));
    expect(p.os).toBe("windows");
    expect(p.formFactor).toBe("desktop");
  });

  it("detects macOS desktop", () => {
    expect(detectPlatformProfile(env({ userAgent: UA.mac })).os).toBe("macos");
  });

  it("detects iPhone as mobile iOS", () => {
    const p = detectPlatformProfile(env({ userAgent: UA.iphone }));
    expect(p.os).toBe("ios");
    expect(p.formFactor).toBe("mobile");
  });

  it("treats touch-capable iPadOS (Mac UA + touch points) as iOS", () => {
    const p = detectPlatformProfile(env({ userAgent: UA.ipadOS, maxTouchPoints: 5 }));
    expect(p.os).toBe("ios");
    expect(p.formFactor).toBe("mobile");
  });

  it("keeps a real Mac (no touch) as macOS", () => {
    expect(detectPlatformProfile(env({ userAgent: UA.mac, maxTouchPoints: 0 })).os).toBe("macos");
  });

  it("detects Android as mobile", () => {
    const p = detectPlatformProfile(env({ userAgent: UA.android }));
    expect(p.os).toBe("android");
    expect(p.formFactor).toBe("mobile");
  });

  it("detects Linux desktop", () => {
    expect(detectPlatformProfile(env({ userAgent: UA.linux })).os).toBe("linux");
  });

  it("reports standalone surface when installed", () => {
    expect(detectPlatformProfile(env({ userAgent: UA.android, standalone: true })).surface).toBe("standalone");
    expect(detectPlatformProfile(env({ userAgent: UA.android })).surface).toBe("browser");
  });
});

describe("resolvePlatformDefaults — target presets", () => {
  it("desktop with File System Access prefers a folder", () => {
    const p = detectPlatformProfile(env({ userAgent: UA.windows, capabilities: CAPS({ fileSystemAccess: true, opfs: true }) }));
    const d = resolvePlatformDefaults(p);
    expect(d.backupTarget).toBe("filesystem");
    expect(d.autoImport).toBe(true);
  });

  it("mobile prefers OPFS even when file access exists", () => {
    const p = detectPlatformProfile(env({ userAgent: UA.android, capabilities: CAPS({ fileSystemAccess: true, opfs: true }) }));
    expect(resolvePlatformDefaults(p).backupTarget).toBe("opfs");
  });

  it("falls back to download when no persistent API is available", () => {
    const p = detectPlatformProfile(env({ userAgent: UA.linux, capabilities: CAPS() }));
    const d = resolvePlatformDefaults(p);
    expect(d.backupTarget).toBe("download");
    expect(d.autoImport).toBe(false);
  });

  it("desktop without file access but with OPFS uses OPFS", () => {
    const p = detectPlatformProfile(env({ userAgent: UA.mac, capabilities: CAPS({ opfs: true }) }));
    expect(resolvePlatformDefaults(p).backupTarget).toBe("opfs");
  });
});

describe("readPlatformEnv + getPlatformProfile (real globals)", () => {
  it("reads a usable environment from jsdom without throwing", () => {
    const env = readPlatformEnv();
    expect(typeof env.userAgent).toBe("string");
    expect(typeof env.maxTouchPoints).toBe("number");
    expect(env.capabilities).toBeTypeOf("object");
    expect(typeof env.capabilities.opfs).toBe("boolean");
  });

  it("returns a profile and memoizes it (same reference on repeat calls)", () => {
    const first = getPlatformProfile();
    const second = getPlatformProfile();
    expect(first).toBe(second);
    expect(["windows", "macos", "ios", "android", "linux", "unknown"]).toContain(first.os);
    expect(["desktop", "mobile"]).toContain(first.formFactor);
  });
});
