/**
 * Rasterises a country's flag emoji into a PNG data URL so it can be embedded
 * in the generated PDF (jsPDF core fonts are Latin-1 only and cannot render
 * emoji as text — but they can embed images via addImage).
 *
 * Reuses `getCountryFlag` (the same name→flag source the web UI uses) so the
 * PDF stays in lock-step with the app, needs zero bundled assets, and works
 * for any destination automatically — including multi-country and future
 * domestic scopes. Degrades to `null` when no canvas is available (e.g. the
 * jsdom test environment), letting callers fall back to a vector glyph.
 */
import { getCountryFlag } from "./countryFlags";

export type FlagImage = { dataUrl: string; aspect: number };

const cache = new Map<string, FlagImage | null>();

const RENDER_PX = 96;

export function getFlagImage(name: string): FlagImage | null {
  const key = name.trim();
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const result = rasterise(getCountryFlag(key));
  cache.set(key, result);
  return result;
}

function rasterise(glyph: string): FlagImage | null {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const font = `${RENDER_PX}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.font = font;
  const measured = ctx.measureText(glyph).width;
  if (!measured || !Number.isFinite(measured)) return null;

  const w = Math.ceil(measured);
  const h = Math.ceil(RENDER_PX * 1.2);
  canvas.width = w;
  canvas.height = h;

  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.clearRect(0, 0, w, h);
  ctx.fillText(glyph, w / 2, h / 2);

  let dataUrl: string;
  try {
    dataUrl = canvas.toDataURL("image/png");
  } catch {
    return null;
  }
  if (!dataUrl.startsWith("data:image/png")) return null;

  return { dataUrl, aspect: w / h };
}
