import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import type { TripPlan } from "../core/utils/tripPlans";
import type { Country } from "../core/types";
import type { PdfRouteStop } from "./pdfModel";
import { buildItineraryHtml } from "./pdfExport";

// A4 in points (jsPDF unit: "pt").
const PAGE_W = 595.28;
const PAGE_H = 841.89;

// Layout width (px) the itinerary HTML is rendered at before rasterising. Matches
// the print template's max-width so the shared PDF frames identically to Export.
const RENDER_W = 800;

// Rasterisation scale — higher = crisper text/icons in the shared PDF.
const SCALE = 2;

// Ivory page background from the template so no page is transparent and short
// pages read as the same emerald/ivory sheet as Export.
const PAGE_BG = "#faf8f1";
const PAGE_BG_RGB: [number, number, number] = [250, 248, 241];

// Top/bottom breathing room (pt) on every page. Page 1's top and the last
// page's bottom already get the template's body padding; this ensures the
// content on continuation pages isn't flush against the sheet edge.
const MARGIN_Y = 24;

const filenameSafe = (s: string): string =>
  s.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "itinerary";

/** Suggested download/share filename for a country's itinerary PDF. */
export function itineraryPdfName(country: Country): string {
  return `${filenameSafe(country.name)}-itinerary.pdf`;
}

/** A page's vertical slice of the source canvas, in canvas pixels. */
type PageSlice = { start: number; end: number };

/**
 * Compute page slices that never cut an atomic block (day / section / notes
 * card) across a page boundary — the same guarantee `break-inside: avoid` gives
 * the print Export. `tops`/`bottoms` are each in-flow block's canvas-pixel span.
 * A block taller than a page is hard-split (unavoidable), but never a normal one.
 */
export function paginate(tops: number[], bottoms: number[], totalH: number, pageH: number): PageSlice[] {
  const slices: PageSlice[] = [];
  let pageTop = 0;
  for (let i = 0; i < tops.length; i++) {
    if (bottoms[i] - pageTop <= pageH) continue; // block still fits on the current page
    if (tops[i] - pageTop > 1) {
      // Content precedes this block on the page — break just above it.
      slices.push({ start: pageTop, end: tops[i] });
      pageTop = tops[i];
      if (bottoms[i] - pageTop <= pageH) continue;
    }
    // The block itself is taller than a page — hard-split it across pages.
    while (bottoms[i] - pageTop > pageH) {
      slices.push({ start: pageTop, end: pageTop + pageH });
      pageTop += pageH;
    }
  }
  if (pageTop < totalH) slices.push({ start: pageTop, end: totalH });
  return slices.length ? slices : [{ start: 0, end: totalH }];
}

type RenderResult = { canvas: HTMLCanvasElement; tops: number[]; bottoms: number[] };

/**
 * Render the shared itinerary HTML off-screen, rasterise it, and capture each
 * in-flow block's vertical span (for boundary-aware pagination). An isolated
 * iframe keeps the template's global class styles from leaking into the app; it
 * is always torn down, even on failure.
 */
async function renderItinerary(html: string): Promise<RenderResult> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = `position:fixed;top:0;left:-10000px;width:${RENDER_W}px;height:10px;border:0;visibility:hidden;`;
  document.body.appendChild(iframe);
  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error("iframe document unavailable");
    doc.open();
    doc.write(html);
    doc.close();

    // Let styles/inline images (brand logo data URL) apply and web fonts settle.
    await new Promise<void>((resolve) => {
      if (iframe.contentWindow?.document.readyState === "complete") resolve();
      else iframe.addEventListener("load", () => resolve(), { once: true });
    });
    await (iframe.contentDocument?.fonts?.ready ?? Promise.resolve());
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    const body = iframe.contentDocument?.body;
    const win = iframe.contentWindow;
    if (!body || !win) throw new Error("iframe body unavailable");

    // Measure atomic in-flow blocks (skip out-of-flow decoration like the
    // absolutely-positioned brand mark) so pages break between cards.
    const tops: number[] = [];
    const bottoms: number[] = [];
    for (const el of Array.from(body.children) as HTMLElement[]) {
      const pos = win.getComputedStyle(el).position;
      if (pos === "absolute" || pos === "fixed") continue;
      tops.push(el.offsetTop * SCALE);
      bottoms.push((el.offsetTop + el.offsetHeight) * SCALE);
    }

    const canvas = await html2canvas(body, {
      backgroundColor: PAGE_BG,
      scale: SCALE,
      useCORS: true,
      windowWidth: RENDER_W,
      width: RENDER_W,
    });
    return { canvas, tops, bottoms };
  } finally {
    iframe.remove();
  }
}

/** Crop a vertical slice of the source canvas into a fresh canvas. Falls back to
 * the source canvas when a 2D context is unavailable (e.g. jsdom under test). */
function sliceCanvas(src: HTMLCanvasElement, start: number, end: number): HTMLCanvasElement {
  const h = Math.max(1, Math.round(end - start));
  const out = document.createElement("canvas");
  out.width = src.width;
  out.height = h;
  const ctx = out.getContext("2d");
  if (!ctx) return src;
  ctx.fillStyle = PAGE_BG;
  ctx.fillRect(0, 0, out.width, h);
  ctx.drawImage(src, 0, Math.round(start), src.width, h, 0, 0, src.width, h);
  return out;
}

/**
 * Render a styled, multi-page itinerary PDF and return it as a Blob for the
 * native share sheet. Rasterises the very same HTML the "Export PDF" flow prints
 * (via `buildItineraryHtml`), so the shared file is pixel-identical to Export,
 * and paginates at card boundaries so a day/section never splits across a page.
 * jsPDF + html2canvas are heavy, so this module is only ever reached through a
 * dynamic import — never statically.
 */
export async function buildItineraryPdfBlob(
  plan: TripPlan,
  country: Country,
  homeCountry: string,
  stops?: PdfRouteStop[],
): Promise<Blob> {
  const html = buildItineraryHtml(plan, country, homeCountry, stops);
  const { canvas, tops, bottoms } = await renderItinerary(html);

  // Usable height per page after top/bottom margins; a full page of source
  // canvas maps to that inset area (image spans the full page width).
  const usableH = PAGE_H - MARGIN_Y * 2;
  const pageHpx = (usableH * canvas.width) / PAGE_W;
  const slices = paginate(tops, bottoms, canvas.height, pageHpx);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  slices.forEach((slice, i) => {
    if (i > 0) doc.addPage();
    const pageCanvas = sliceCanvas(canvas, slice.start, slice.end);
    const imgH = (pageCanvas.height * PAGE_W) / pageCanvas.width;
    doc.setFillColor(...PAGE_BG_RGB);
    doc.rect(0, 0, PAGE_W, PAGE_H, "F");
    doc.addImage(pageCanvas.toDataURL("image/png"), "PNG", 0, MARGIN_Y, PAGE_W, imgH, undefined, "FAST");
  });

  return doc.output("blob");
}
