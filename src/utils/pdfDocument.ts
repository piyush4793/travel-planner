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
const NOTE_BG: RGB = [238, 242, 255];

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
  };

  // Draw a self-contained text block (optionally on a rounded background card).
  // Blocks never split across pages.
  const block = (text: string, opts: BlockOpts = {}): void => {
    const {
      size = 11, color = INK, bold = false, gap = 4, indent = 0,
      bg, radius = 6, padX = 0, padY = 0,
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

  // Render one day as a cohesive bordered card: tinted header (label + theme
  // pill) connected to a body of activity bullets and hotel chips — mirrors
  // the on-screen itinerary card so the shared PDF matches the web view.
  const drawDayCard = (day: TripPlan["days"][number]): void => {
    const cardPadX = 14;
    const headPadY = 10;
    const innerW = CONTENT_W - cardPadX * 2;
    const labelSize = 10, themeSize = 9, actSize = 11, hotelSize = 9;
    const labelLH = labelSize * 1.35;
    const actLH = actSize * 1.35;
    const pillH = 15, pillPadX = 7, chipH = 16, chipPadX = 8, chipGap = 6, rowGap = 6;

    const labelUpper = day.label.toUpperCase();
    const labelLines = wrap(labelUpper, labelSize, true, innerW);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(labelSize);
    const labelSingleW = doc.getTextWidth(pdfSafe(labelUpper));

    const theme = day.theme ? pdfSafe(day.theme) : "";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(themeSize);
    const pillW = theme ? doc.getTextWidth(theme) + pillPadX * 2 : 0;

    const inlineTheme = !!theme && labelLines.length === 1 && labelSingleW + 8 + pillW <= innerW;
    const labelBlockH = labelLines.length * labelLH;
    const headerContentH = inlineTheme
      ? Math.max(labelBlockH, pillH)
      : labelBlockH + (theme ? 5 + pillH : 0);
    const headerH = headPadY * 2 + headerContentH;

    const actTextX = MARGIN + cardPadX + 14;
    const actMaxW = PAGE_W - MARGIN - actTextX;
    const actLineSets = day.activities.map((a) => wrap(a, actSize, false, actMaxW));
    let actsH = 0;
    for (const set of actLineSets) actsH += set.length * actLH + 5;

    const hotels = (day.hotels ?? []).map((h) => pdfSafe(h)).filter(Boolean);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(hotelSize);
    const chipRows: { text: string; w: number }[][] = [];
    if (hotels.length) {
      let row: { text: string; w: number }[] = [];
      let rowW = 0;
      for (const h of hotels) {
        const w = doc.getTextWidth(h) + chipPadX * 2;
        if (row.length && rowW + w > innerW) { chipRows.push(row); row = []; rowW = 0; }
        row.push({ text: h, w });
        rowW += w + chipGap;
      }
      if (row.length) chipRows.push(row);
    }
    const stayLabelH = hotels.length ? 12 : 0;
    const chipsH = hotels.length ? chipRows.length * chipH + (chipRows.length - 1) * rowGap : 0;
    const hotelsBlockH = hotels.length ? 6 + stayLabelH + chipsH : 0;

    const bodyTopGap = 10;
    const bodyBottomPad = 12;
    const totalH = headerH + bodyTopGap + actsH + hotelsBlockH + bodyBottomPad;

    const usable = BOTTOM - MARGIN;
    if (totalH <= usable) ensureSpace(totalH);
    else if (cursor.y > MARGIN) { doc.addPage(); cursor.y = MARGIN; }

    const y0 = cursor.y;

    doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
    doc.setLineWidth(1);
    doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
    doc.roundedRect(MARGIN, y0, CONTENT_W, totalH, 8, 8, "FD");

    doc.setFillColor(DAY_BG[0], DAY_BG[1], DAY_BG[2]);
    doc.roundedRect(MARGIN + 1, y0 + 1, CONTENT_W - 2, headerH - 2, 7, 7, "F");
    doc.rect(MARGIN + 1, y0 + headerH - 9, CONTENT_W - 2, 7, "F");
    doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
    doc.setLineWidth(0.75);
    doc.line(MARGIN, y0 + headerH, PAGE_W - MARGIN, y0 + headerH);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(labelSize);
    doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
    let ly = y0 + headPadY + labelSize * 0.9;
    for (const line of labelLines) {
      doc.text(line, MARGIN + cardPadX, ly, { charSpace: 0.4 });
      ly += labelLH;
    }
    if (theme) {
      const pillX = inlineTheme ? MARGIN + cardPadX + labelSingleW + 8 : MARGIN + cardPadX;
      const pillCenterY = inlineTheme
        ? y0 + headPadY + headerContentH / 2
        : y0 + headPadY + labelBlockH + 5 + pillH / 2;
      const pillY = pillCenterY - pillH / 2;
      doc.setFillColor(ACCENT_SOFT[0], ACCENT_SOFT[1], ACCENT_SOFT[2]);
      doc.roundedRect(pillX, pillY, pillW, pillH, pillH / 2, pillH / 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(themeSize);
      doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
      doc.text(theme, pillX + pillPadX, pillY + pillH / 2 + themeSize * 0.34);
    }

    let by = y0 + headerH + bodyTopGap;
    for (const set of actLineSets) {
      doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
      doc.circle(MARGIN + cardPadX + 3, by + actSize * 0.5, 1.7, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(actSize);
      doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
      let ty = by + actSize * 0.95;
      for (const line of set) { doc.text(line, actTextX, ty); ty += actLH; }
      by += set.length * actLH + 5;
    }

    if (hotels.length) {
      by += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
      doc.text("STAY", MARGIN + cardPadX, by + 8, { charSpace: 0.6 });
      by += stayLabelH;
      for (const row of chipRows) {
        let cx = MARGIN + cardPadX;
        for (const chip of row) {
          doc.setFillColor(CARD_BG[0], CARD_BG[1], CARD_BG[2]);
          doc.roundedRect(cx, by, chip.w, chipH, chipH / 2, chipH / 2, "F");
          doc.setFont("helvetica", "normal");
          doc.setFontSize(hotelSize);
          doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
          doc.text(chip.text, cx + chipPadX, by + chipH / 2 + hotelSize * 0.34);
          cx += chip.w + chipGap;
        }
        by += chipH + rowGap;
      }
    }

    cursor.y = y0 + totalH + 12;
  };

  // ── Header band ──
  {
    const padX = 22, padTop = 20, padBottom = 20;
    const nameSize = 26, nameLH = nameSize * 1.2;
    const nameLines = wrap(country.name, nameSize, true, CONTENT_W - padX * 2);

    const metaItems = [
      `From ${homeCountry}`,
      country.budget ? country.budget : "",
      country.bestMonths.length ? `Best: ${country.bestMonths.join(", ")}` : "",
    ].filter(Boolean);

    const pillSize = 9, pillH = 17, pillPadX = 9, pillGap = 7, pillRowGap = 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(pillSize);
    const maxPillW = CONTENT_W - padX * 2;
    const pillRows: { text: string; w: number }[][] = [];
    {
      let row: { text: string; w: number }[] = [];
      let rowW = 0;
      for (const item of metaItems) {
        const text = pdfSafe(item);
        const w = doc.getTextWidth(text) + pillPadX * 2;
        if (row.length && rowW + w > maxPillW) { pillRows.push(row); row = []; rowW = 0; }
        row.push({ text, w });
        rowW += w + pillGap;
      }
      if (row.length) pillRows.push(row);
    }
    const pillsH = pillRows.length ? pillRows.length * pillH + (pillRows.length - 1) * pillRowGap : 0;
    const eyebrowBlock = 18;
    const bandH = padTop + eyebrowBlock + nameLines.length * nameLH + (pillsH ? 12 + pillsH : 0) + padBottom;
    ensureSpace(bandH);

    const bx = MARGIN, byTop = cursor.y;
    doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.roundedRect(bx, byTop, CONTENT_W, bandH, 14, 14, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(ACCENT_SOFT[0], ACCENT_SOFT[1], ACCENT_SOFT[2]);
    doc.text("TRAVEL ITINERARY", bx + padX, byTop + padTop + 8.5, { charSpace: 1.4 });

    let y = byTop + padTop + eyebrowBlock;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(nameSize);
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
    for (const line of nameLines) { doc.text(line, bx + padX, y + nameSize * 0.82); y += nameLH; }

    if (pillsH) {
      y += 12;
      for (const row of pillRows) {
        let px = bx + padX;
        for (const pill of row) {
          doc.setFillColor(ACCENT_SOFT[0], ACCENT_SOFT[1], ACCENT_SOFT[2]);
          doc.roundedRect(px, y, pill.w, pillH, pillH / 2, pillH / 2, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(pillSize);
          doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
          doc.text(pill.text, px + pillPadX, y + pillH / 2 + pillSize * 0.34);
          px += pill.w + pillGap;
        }
        y += pillH + pillRowGap;
      }
    }

    cursor.y = byTop + bandH + 16;
  }

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
    drawDayCard(day);
  }

  // ── Note callout ──
  if (plan.note) {
    const cardPadX = 16, cardPadY = 12;
    const titleH = 15, bodySize = 10, bodyLH = bodySize * 1.4;
    const innerW = CONTENT_W - cardPadX * 2;
    const bodyLines = wrap(plan.note, bodySize, false, innerW);
    const totalH = cardPadY + titleH + bodyLines.length * bodyLH + cardPadY;
    ensureSpace(totalH + 10);
    cursor.y += 4;
    const y0 = cursor.y;

    doc.setFillColor(NOTE_BG[0], NOTE_BG[1], NOTE_BG[2]);
    doc.roundedRect(MARGIN, y0, CONTENT_W, totalH, 8, 8, "F");
    doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.rect(MARGIN, y0 + 9, 3, totalH - 18, "F");

    const tx = MARGIN + cardPadX;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.text("GOOD TO KNOW", tx, y0 + cardPadY + 8.5, { charSpace: 1 });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(bodySize);
    doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
    let ny = y0 + cardPadY + titleH + bodySize * 0.9;
    for (const line of bodyLines) { doc.text(line, tx, ny); ny += bodyLH; }
    cursor.y = y0 + totalH + 8;
  }

  // ── Footer ──
  rule();
  const stamp = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  ensureSpace(16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text(pdfSafe(`Generated by Roamwise  \u00B7  ${stamp}`), PAGE_W / 2, cursor.y + 2, { align: "center" });

  return doc.output("blob");
}
