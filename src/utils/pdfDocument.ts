import { jsPDF } from "jspdf";
import type { TripPlan } from "../core/utils/tripPlans";
import { extractPlanCities } from "../core/utils/tripPlans";
import type { Country } from "../core/types";

// A4 in points (jsPDF unit: "pt").
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM = PAGE_H - MARGIN;

type RGB = [number, number, number];
const INK: RGB = [30, 41, 59];
const SLATE: RGB = [51, 65, 85];
const MUTED: RGB = [100, 116, 139];
const ACCENT: RGB = [79, 70, 229];
const ACCENT_SOFT: RGB = [224, 231, 255];
const RULE: RGB = [226, 232, 240];
const CARD_BG: RGB = [241, 245, 249];
const DAY_BG: RGB = [248, 250, 252];
const WHITE: RGB = [255, 255, 255];
const AMBER_BG: RGB = [255, 251, 235];
const AMBER_INK: RGB = [146, 64, 14];

// jsPDF's built-in fonts only cover Latin-1, so map the glyphs our content
// commonly uses (rupee sign, arrows, smart quotes, dashes) to safe equivalents
// and drop anything else (e.g. emoji) that would otherwise render as tofu.
function pdfSafe(s: string): string {
  return s
    .replace(/\u20B9/g, "Rs ")
    .replace(/[\u2192\u2794\u27A1]/g, ">")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[^\x00-\xFF]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

const filenameSafe = (s: string): string =>
  s.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "itinerary";

/** Suggested download/share filename for a country's itinerary PDF. */
export function itineraryPdfName(country: Country): string {
  return `${filenameSafe(country.name)}-itinerary.pdf`;
}

/**
 * Render a styled, multi-page itinerary PDF and return it as a Blob.
 * jsPDF is bundled into this module's lazy chunk — import it dynamically so it
 * stays out of the initial app bundle.
 */
export function buildItineraryPdfBlob(plan: TripPlan, country: Country, homeCountry: string): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const cursor = { y: MARGIN };

  const ensureSpace = (needed: number): void => {
    if (cursor.y + needed > BOTTOM) {
      doc.addPage();
      cursor.y = MARGIN;
    }
  };

  const wrap = (text: string, size: number, bold: boolean, maxW: number): string[] => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    return doc.splitTextToSize(pdfSafe(text), maxW) as string[];
  };

  type BlockOpts = {
    size?: number;
    color?: RGB;
    bold?: boolean;
    gap?: number;
    indent?: number;
    bg?: RGB;
    radius?: number;
    padX?: number;
    padY?: number;
    accentBar?: RGB;
  };

  // Draw a self-contained text block (optionally on a rounded background card
  // with a left accent bar). Blocks never split across pages.
  const block = (text: string, opts: BlockOpts = {}): void => {
    const {
      size = 11, color = INK, bold = false, gap = 4, indent = 0,
      bg, radius = 6, padX = 0, padY = 0, accentBar,
    } = opts;
    const x0 = MARGIN + indent;
    const boxW = CONTENT_W - indent;
    const innerW = boxW - padX * 2;
    const lines = wrap(text, size, bold, innerW);
    const lineHeight = size * 1.35;
    const h = lines.length * lineHeight + padY * 2;
    ensureSpace(h);
    if (bg) {
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.roundedRect(x0, cursor.y, boxW, h, radius, radius, "F");
    }
    if (accentBar) {
      doc.setFillColor(accentBar[0], accentBar[1], accentBar[2]);
      doc.rect(x0, cursor.y, 3, h, "F");
    }
    doc.setTextColor(color[0], color[1], color[2]);
    let ty = cursor.y + padY + size * 0.95;
    for (const line of lines) {
      doc.text(line, x0 + padX, ty);
      ty += lineHeight;
    }
    cursor.y += h + gap;
  };

  const rule = (): void => {
    ensureSpace(12);
    doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
    doc.setLineWidth(0.75);
    doc.line(MARGIN, cursor.y, PAGE_W - MARGIN, cursor.y);
    cursor.y += 14;
  };

  // Activity line with a drawn accent dot and hanging indent.
  const bullet = (text: string): void => {
    const size = 11;
    const textX = MARGIN + 12 + 12;
    const lines = wrap(text, size, false, PAGE_W - MARGIN - textX);
    const lineHeight = size * 1.35;
    const h = lines.length * lineHeight;
    ensureSpace(h + 3);
    doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.circle(MARGIN + 12 + 3, cursor.y + size * 0.5, 1.7, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
    let ty = cursor.y + size * 0.95;
    for (const line of lines) { doc.text(line, textX, ty); ty += lineHeight; }
    cursor.y += h + 3;
  };

  // ── Header band ──
  const meta = [
    `From ${homeCountry}`,
    country.budget,
    country.bestMonths.length ? `Best months: ${country.bestMonths.join(", ")}` : "",
  ].filter(Boolean).join("   \u00B7   ");

  const padX = 18;
  const nameLines = wrap(country.name, 24, true, CONTENT_W - padX * 2);
  const metaLines = meta ? wrap(meta, 10, false, CONTENT_W - padX * 2) : [];
  const nameLH = 24 * 1.28;
  const metaLH = 10 * 1.4;
  const bandH = 18 + nameLines.length * nameLH + (metaLines.length ? 6 + metaLines.length * metaLH : 0) + 18;
  ensureSpace(bandH);
  doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.roundedRect(MARGIN, cursor.y, CONTENT_W, bandH, 12, 12, "F");
  let hy = cursor.y + 18 + 24 * 0.9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  for (const line of nameLines) { doc.text(line, MARGIN + padX, hy); hy += nameLH; }
  if (metaLines.length) {
    hy += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(ACCENT_SOFT[0], ACCENT_SOFT[1], ACCENT_SOFT[2]);
    for (const line of metaLines) { doc.text(line, MARGIN + padX, hy); hy += metaLH; }
  }
  cursor.y += bandH + 16;

  // ── Summary card ──
  const route = extractPlanCities(plan.days);
  const summary = [
    plan.duration,
    `${plan.costPerPerson} / person`,
    route.length ? `${route.length} ${route.length === 1 ? "city" : "cities"}` : "",
  ].filter(Boolean).join("     \u00B7     ");
  block(summary, { size: 12, bold: true, color: SLATE, bg: CARD_BG, padX: 16, padY: 12, radius: 8, gap: route.length ? 8 : 12 });

  if (route.length) {
    block(`Route:  ${route.join("  >  ")}`, { size: 10, color: MUTED, gap: 12 });
  }

  if (plan.warning) {
    block(`!  ${plan.warning}`, { size: 10, color: AMBER_INK, bg: AMBER_BG, padX: 12, padY: 10, radius: 6, gap: 14 });
  }

  // ── Days ──
  for (const day of plan.days) {
    ensureSpace(46);
    const heading = day.theme ? `${day.label}     ${day.theme}` : day.label;
    block(heading, { size: 12, bold: true, color: ACCENT, bg: DAY_BG, accentBar: ACCENT, padX: 12, padY: 8, radius: 6, gap: 6 });
    for (const activity of day.activities) {
      bullet(activity);
    }
    if (day.hotels?.length) {
      block(`Stay:  ${day.hotels.join(", ")}`, { size: 10, color: MUTED, indent: 12, gap: 3 });
    }
    cursor.y += 10;
  }

  // ── Note + footer ──
  if (plan.note) {
    rule();
    block(plan.note, { size: 10, color: MUTED, bg: CARD_BG, padX: 14, padY: 10, radius: 8, gap: 8 });
  }

  const stamp = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  ensureSpace(16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(pdfSafe(`Generated by Roamwise  \u00B7  ${stamp}`), PAGE_W / 2, cursor.y + 8, { align: "center" });

  return doc.output("blob");
}
