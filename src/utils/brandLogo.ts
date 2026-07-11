/**
 * The Roamwise brand mark as an inlined base64 PNG data URL, so the generated
 * PDF can stamp the app's own logo (via jsPDF addImage) instead of a generic
 * icon — synchronously, offline, and with no runtime fetch. Mirrors the same
 * app icon the PWA/manifest ships, so the PDF stays on-brand automatically.
 *
 * The mark lives under src/assets (not public/) so Vite bundles it; the build
 * force-inlines this asset as base64 (see vite.config.ts assetsInlineLimit), so
 * the import yields a data URL rather than a leaked asset URL in production.
 */
import logoDataUrl from "../assets/brandMark.png";

export type BrandLogo = { dataUrl: string; aspect: number };

// The app icon is a square (1:1) raster.
export function getBrandLogo(): BrandLogo {
  return { dataUrl: logoDataUrl, aspect: 1 };
}
