import { jsPDF } from "jspdf";
import type { TripPlan } from "../core/utils/tripPlans";
import { extractPlanCities } from "../core/utils/tripPlans";
import { parseNoteItems } from "../core/utils/practicalNotes";
import { appUrl } from "../core/utils/appUrl";
import type { Country } from "../core/types";
import { buildPdfModel, type PdfRouteStop, type PdfSection } from "./pdfModel";
import { getFlagImage } from "./flagImage";
import { getBrandLogo } from "./brandLogo";

// A4 in points (jsPDF unit: "pt").
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM = PAGE_H - MARGIN;

type RGB = [number, number, number];
const INK: RGB = [28, 43, 38];
const SLATE: RGB = [51, 64, 58];
const MUTED: RGB = [91, 107, 100];
const ACCENT: RGB = [5, 150, 105];
const ACCENT_DEEP: RGB = [6, 78, 59];
const ACCENT_SOFT: RGB = [209, 250, 229];
const RULE: RGB = [230, 226, 213];
const CARD_BG: RGB = [244, 242, 234];
const DAY_BG: RGB = [244, 242, 234];
const WHITE: RGB = [255, 255, 255];
const AMBER_BG: RGB = [255, 251, 235];
const AMBER_INK: RGB = [146, 64, 14];

// Vector icon set drawn with jsPDF primitives. jsPDF's core fonts can't render
// emoji, so decorative glyphs are drawn as crisp line/fill shapes instead —
// keeping the PDF lively without embedding an icon font. Each icon renders
// inside an `s`×`s` box anchored at (x, y) and inherits the passed colour.
type IconName =
  | "pin" | "calendar" | "money" | "sun" | "city" | "compass" | "warning";

function drawIcon(doc: jsPDF, name: IconName, x: number, y: number, s: number, rgb: RGB): void {
  const [r, g, b] = rgb;
  doc.setDrawColor(r, g, b);
  doc.setFillColor(r, g, b);
  doc.setLineWidth(Math.max(0.6, s * 0.08));
  doc.setLineCap("round");
  doc.setLineJoin("round");
  const cx = x + s / 2, cy = y + s / 2;

  switch (name) {
    case "pin": {
      const topY = y + s * 0.36, r0 = s * 0.3;
      doc.circle(cx, topY, r0, "F");
      doc.triangle(cx - r0 * 0.74, topY + r0 * 0.5, cx + r0 * 0.74, topY + r0 * 0.5, cx, y + s * 0.98, "F");
      doc.setFillColor(255, 255, 255);
      doc.circle(cx, topY, s * 0.1, "F");
      doc.setFillColor(r, g, b);
      break;
    }
    case "calendar": {
      doc.roundedRect(x + s * 0.08, y + s * 0.18, s * 0.84, s * 0.72, s * 0.1, s * 0.1, "S");
      doc.line(x + s * 0.08, y + s * 0.38, x + s * 0.92, y + s * 0.38);
      doc.line(x + s * 0.3, y + s * 0.08, x + s * 0.3, y + s * 0.24);
      doc.line(x + s * 0.7, y + s * 0.08, x + s * 0.7, y + s * 0.24);
      break;
    }
    case "money": {
      doc.roundedRect(x + s * 0.06, y + s * 0.26, s * 0.88, s * 0.48, s * 0.08, s * 0.08, "S");
      doc.circle(cx, cy, s * 0.13, "S");
      break;
    }
    case "sun": {
      doc.circle(cx, cy, s * 0.22, "S");
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI / 4) * i;
        const ix = cx + Math.cos(a) * s * 0.32, iy = cy + Math.sin(a) * s * 0.32;
        const ox = cx + Math.cos(a) * s * 0.46, oy = cy + Math.sin(a) * s * 0.46;
        doc.line(ix, iy, ox, oy);
      }
      break;
    }
    case "city": {
      doc.rect(x + s * 0.1, y + s * 0.5, s * 0.32, s * 0.42, "F");
      doc.rect(x + s * 0.52, y + s * 0.26, s * 0.36, s * 0.66, "F");
      break;
    }
    case "compass": {
      doc.circle(cx, cy, s * 0.44, "S");
      doc.triangle(cx, y + s * 0.2, cx + s * 0.13, cy, cx - s * 0.13, cy, "F");
      doc.triangle(cx, y + s * 0.8, cx + s * 0.13, cy, cx - s * 0.13, cy, "S");
      break;
    }
    case "warning": {
      doc.triangle(cx, y + s * 0.12, x + s * 0.06, y + s * 0.9, x + s * 0.94, y + s * 0.9, "S");
      doc.line(cx, y + s * 0.42, cx, y + s * 0.66);
      doc.circle(cx, y + s * 0.78, s * 0.035, "F");
      break;
    }
  }
}

// Draw an image (country flag or brand logo) inside a small white rounded tile
// (for contrast on coloured bands) and return the tile's total width so callers
// can lay text out beside it. Flags are rasterised from the same emoji source
// the web uses (flagImage.ts); the logo comes from brandLogo.ts. Defensive: if
// addImage fails (e.g. an environment without image decoding), the tile is
// still drawn so layout stays intact.
function drawImageTile(doc: jsPDF, img: { dataUrl: string; aspect: number }, x: number, y: number, h: number): number {
  const pad = 1.5;
  const w = h * img.aspect;
  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, w + pad * 2, h + pad * 2, 2.5, 2.5, "FD");
  try {
    doc.addImage(img.dataUrl, "PNG", x + pad, y + pad, w, h);
  } catch {
    /* keep the tile; image decoding unavailable */
  }
  return w + pad * 2;
}

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
export function buildItineraryPdfBlob(
  plan: TripPlan,
  country: Country,
  homeCountry: string,
  stops?: PdfRouteStop[],
): Blob {
  const model = buildPdfModel(plan, country, homeCountry, stops);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const cursor = { y: MARGIN };

  const ensureSpace = (needed: number): void => {
    if (cursor.y + needed > BOTTOM) {
      doc.addPage();
      cursor.y = MARGIN;
    }
  };

  const wrap = (text: string, size: number, bold: boolean, maxW: number, family: "helvetica" | "times" = "helvetica"): string[] => {
    doc.setFont(family, bold ? "bold" : "normal");
    doc.setFontSize(size);
    return doc.splitTextToSize(pdfSafe(text), maxW) as string[];
  };

  // Word-wrap where the first line has a narrower width (to make room for an
  // inline label prefix) and continuation lines use the full block width.
  const wrapWithIndent = (text: string, size: number, firstMaxW: number, restMaxW: number): string[] => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    const words = pdfSafe(text).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = "";
    let maxW = firstMaxW;
    for (const word of words) {
      const trial = cur ? `${cur} ${word}` : word;
      if (cur && doc.getTextWidth(trial) > maxW) {
        lines.push(cur);
        cur = word;
        maxW = restMaxW;
      } else {
        cur = trial;
      }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
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
    icon?: IconName;
    iconColor?: RGB;
  };

  // Draw a self-contained text block (optionally on a rounded background card,
  // optionally with a leading vector icon). Blocks never split across pages.
  const block = (text: string, opts: BlockOpts = {}): void => {
    const {
      size = 11, color = INK, bold = false, gap = 4, indent = 0,
      bg, radius = 6, padX = 0, padY = 0, icon, iconColor,
    } = opts;
    const x0 = MARGIN + indent;
    const boxW = CONTENT_W - indent;
    const iconS = icon ? size + 2 : 0;
    const iconIndent = icon ? iconS + 7 : 0;
    const innerW = boxW - padX * 2 - iconIndent;
    const lines = wrap(text, size, bold, innerW);
    const lineHeight = size * 1.35;
    const h = lines.length * lineHeight + padY * 2;
    ensureSpace(h);
    if (bg) {
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.roundedRect(x0, cursor.y, boxW, h, radius, radius, "F");
    }
    if (icon) {
      drawIcon(doc, icon, x0 + padX, cursor.y + padY + (size * 1.35 - iconS) / 2, iconS, iconColor ?? color);
    }
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(color[0], color[1], color[2]);
    let ty = cursor.y + padY + size * 0.95;
    for (const line of lines) {
      doc.text(line, x0 + padX + iconIndent, ty);
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
    const labelIconS = labelSize + 1;
    const labelIndent = labelIconS + 6;
    const labelLines = wrap(labelUpper, labelSize, true, innerW - labelIndent);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(labelSize);
    const labelSingleW = doc.getTextWidth(pdfSafe(labelUpper));

    const theme = day.theme ? pdfSafe(day.theme) : "";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(themeSize);
    const pillW = theme ? doc.getTextWidth(theme) + pillPadX * 2 : 0;

    const inlineTheme = !!theme && labelLines.length === 1 && labelIndent + labelSingleW + 8 + pillW <= innerW;
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
    // Center the icon, label and inline theme pill on one line so they align.
    const headerCenterY = y0 + headPadY + headerContentH / 2;
    const firstLineCenterY = inlineTheme ? headerCenterY : y0 + headPadY + labelLH / 2;
    drawIcon(doc, "calendar", MARGIN + cardPadX, firstLineCenterY - labelIconS / 2, labelIconS, ACCENT);
    const labelX = MARGIN + cardPadX + labelIndent;
    let ly = firstLineCenterY + labelSize * 0.35;
    for (const line of labelLines) {
      doc.text(line, labelX, ly, { charSpace: 0.4 });
      ly += labelLH;
    }
    if (theme) {
      const pillX = inlineTheme ? labelX + labelSingleW + 8 : labelX;
      const pillCenterY = inlineTheme
        ? headerCenterY
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

  // Render a per-stop section header band for multi-stop routes: a slim accent
  // card with a left rule, the stop name, and a meta line (day range, cost,
  // best months). Scales to any number of stops — one section per stop.
  const drawSectionHeader = (section: PdfSection, index: number): void => {
    const padX = 16, padY = 11, barW = 4;
    const eyebrowSize = 8, nameSize = 15, metaSize = 9.5;
    const nameLH = nameSize * 1.2;
    const textX = MARGIN + padX + barW + 6;
    const innerW = CONTENT_W - (padX + barW + 6) - padX;
    const flag = getFlagImage(section.name);
    const glyphH = nameSize * 0.95;
    const glyphW = flag ? glyphH * flag.aspect + 3 : nameSize * 0.9;
    const glyphIndent = glyphW + 6;
    const nameLines = wrap(section.name, nameSize, true, innerW - glyphIndent, "times");

    const dayRange = section.dayStart === section.dayEnd
      ? `Day ${section.dayStart}`
      : `Days ${section.dayStart}\u2013${section.dayEnd}`;
    const costText = section.cost ? `${section.cost} / person` : "";
    const bestText = section.bestMonths && section.bestMonths.length
      ? `Best: ${section.bestMonths.join(", ")}`
      : "";
    const metaIconS = metaSize;
    const metaLH = metaSize * 1.35;
    const bestIndent = metaIconS + 5;
    const bestLines = bestText ? wrap(bestText, metaSize, false, innerW - bestIndent) : [];

    const bandH = padY * 2 + 12 + nameLines.length * nameLH
      + 6 + metaLH
      + (bestText ? 3 + bestLines.length * metaLH : 0);

    // Keep a section header attached to at least its first day card.
    ensureSpace(bandH + 60);
    cursor.y += index === 0 ? 0 : 6;
    const y0 = cursor.y;

    doc.setFillColor(ACCENT_SOFT[0], ACCENT_SOFT[1], ACCENT_SOFT[2]);
    doc.roundedRect(MARGIN, y0, CONTENT_W, bandH, 9, 9, "F");
    doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.roundedRect(MARGIN + padX, y0 + padY, barW, bandH - padY * 2, barW / 2, barW / 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(eyebrowSize);
    doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.text(`STOP ${index + 1}`, textX, y0 + padY + eyebrowSize * 0.9, { charSpace: 1.2 });

    let y = y0 + padY + 12;
    doc.setFont("times", "bold");
    doc.setFontSize(nameSize);
    doc.setTextColor(ACCENT_DEEP[0], ACCENT_DEEP[1], ACCENT_DEEP[2]);
    if (flag) drawImageTile(doc, flag, textX, y - 1, glyphH);
    else drawIcon(doc, "pin", textX, y - 1, glyphW, ACCENT);
    for (const line of nameLines) { doc.text(line, textX + glyphIndent, y + nameSize * 0.82); y += nameLH; }

    y += 6;
    // Meta line 1: day range + cost as small icon+text segments.
    let mx = textX;
    const drawMetaSeg = (icon: IconName, text: string): void => {
      const safe = pdfSafe(text);
      drawIcon(doc, icon, mx, y + metaLH / 2 - metaIconS / 2, metaIconS, ACCENT);
      mx += metaIconS + 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(metaSize);
      doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
      doc.text(safe, mx, y + metaLH / 2 + metaSize * 0.34);
      mx += doc.getTextWidth(safe) + 16;
    };
    drawMetaSeg("calendar", dayRange);
    if (costText) drawMetaSeg("money", costText);
    y += metaLH;

    // Meta line 2: best months on their own line (wraps cleanly).
    if (bestText) {
      y += 3;
      drawIcon(doc, "sun", textX, y + metaLH / 2 - metaIconS / 2, metaIconS, ACCENT);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(metaSize);
      doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
      let ly2 = y + metaLH / 2 + metaSize * 0.34;
      for (const line of bestLines) { doc.text(line, textX + bestIndent, ly2); ly2 += metaLH; }
    }

    cursor.y = y0 + bandH + 10;
  };
  {
    const padX = 22, padTop = 20, padBottom = 20;
    const nameSize = 26, nameLH = nameSize * 1.2;
    // The Roamwise brand mark sits in the top-right of every header (letterhead
    // style). Single-country PDFs also show the destination flag beside the
    // title; multi-stop routes carry per-stop flags in their section bands.
    const logo = getBrandLogo();
    const logoH = 32;
    const logoTileW = logoH + 3;
    const titleFlag = model.multi ? null : getFlagImage(country.name);
    const titleFlagH = nameSize * 0.86;
    const titleFlagIndent = titleFlag ? titleFlagH * titleFlag.aspect + 13 : 0;
    const titleMaxW = CONTENT_W - padX * 2 - (logoTileW + 16) - titleFlagIndent;
    const nameLines = wrap(model.title, nameSize, true, titleMaxW, "times");

    const metaItems: { icon: IconName; text: string }[] = model.multi
      ? [
          { icon: "compass", text: `From ${homeCountry}` },
          { icon: "pin", text: `${model.meta.stopCount} countries` },
          { icon: "calendar", text: plan.duration },
          { icon: "money", text: `${plan.costPerPerson} / person` },
        ]
      : [
          { icon: "compass", text: `From ${homeCountry}` },
          ...(country.budget ? [{ icon: "money" as IconName, text: country.budget }] : []),
          ...(country.bestMonths.length
            ? [{ icon: "sun" as IconName, text: `Best: ${country.bestMonths.join(", ")}` }]
            : []),
        ];

    const pillSize = 9, pillH = 17, pillPadX = 9, pillGap = 7, pillRowGap = 7;
    const pillIconS = pillSize + 1, pillIconGap = 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(pillSize);
    const maxPillW = CONTENT_W - padX * 2;
    const pillRows: { icon: IconName; text: string; w: number }[][] = [];
    {
      let row: { icon: IconName; text: string; w: number }[] = [];
      let rowW = 0;
      for (const item of metaItems) {
        const text = pdfSafe(item.text);
        const w = pillIconS + pillIconGap + doc.getTextWidth(text) + pillPadX * 2;
        if (row.length && rowW + w > maxPillW) { pillRows.push(row); row = []; rowW = 0; }
        row.push({ icon: item.icon, text, w });
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

    // Brand logo tile in the top-right of every header (letterhead style).
    const logoTileX = bx + CONTENT_W - padX - logoTileW;
    drawImageTile(doc, logo, logoTileX, byTop + padTop - 1, logoH);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(ACCENT_SOFT[0], ACCENT_SOFT[1], ACCENT_SOFT[2]);
    doc.text("TRAVEL ITINERARY", bx + padX, byTop + padTop + 8.5, { charSpace: 1.4 });

    let y = byTop + padTop + eyebrowBlock;
    doc.setFont("times", "bold");
    doc.setFontSize(nameSize);
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
    if (titleFlag) {
      drawImageTile(doc, titleFlag, bx + padX, y + nameSize * 0.16, titleFlagH);
    }
    for (const line of nameLines) { doc.text(line, bx + padX + titleFlagIndent, y + nameSize * 0.82); y += nameLH; }

    if (pillsH) {
      y += 12;
      for (const row of pillRows) {
        let px = bx + padX;
        for (const pill of row) {
          doc.setFillColor(ACCENT_SOFT[0], ACCENT_SOFT[1], ACCENT_SOFT[2]);
          doc.roundedRect(px, y, pill.w, pillH, pillH / 2, pillH / 2, "F");
          drawIcon(doc, pill.icon, px + pillPadX, y + (pillH - pillIconS) / 2, pillIconS, ACCENT);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(pillSize);
          doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
          doc.text(pill.text, px + pillPadX + pillIconS + pillIconGap, y + pillH / 2 + pillSize * 0.34);
          px += pill.w + pillGap;
        }
        y += pillH + pillRowGap;
      }
    }

    cursor.y = byTop + bandH + 16;
  }

  // ── Summary card ──
  // Multi-country headers already carry duration + cost as pills, so the summary
  // strip (which would repeat them) is single-country only; multi folds the city
  // count into the route line below instead.
  const route = extractPlanCities(plan.days);
  if (!model.multi) {
    const summaryGroups: { icon: IconName; text: string }[] = [
      { icon: "calendar", text: plan.duration },
      { icon: "money", text: `${plan.costPerPerson} / person` },
      ...(route.length ? [{ icon: "city" as IconName, text: `${route.length} ${route.length === 1 ? "city" : "cities"}` }] : []),
    ];
    const padX = 16, padY = 12, size = 12, iconS = size + 2, iconGap = 6, groupGap = 18;
    const h = padY * 2 + size * 1.35;
    ensureSpace(h);
    const y0 = cursor.y;
    doc.setFillColor(CARD_BG[0], CARD_BG[1], CARD_BG[2]);
    doc.roundedRect(MARGIN, y0, CONTENT_W, h, 8, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    let gx = MARGIN + padX;
    const midY = y0 + padY + size * 1.35 / 2;
    summaryGroups.forEach((grp) => {
      const text = pdfSafe(grp.text);
      drawIcon(doc, grp.icon, gx, midY - iconS / 2, iconS, ACCENT);
      gx += iconS + iconGap;
      doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
      doc.text(text, gx, midY + size * 0.34);
      gx += doc.getTextWidth(text) + groupGap;
    });
    cursor.y = y0 + h + (route.length ? 8 : 12);
  }

  if (route.length) {
    const cityCount = `${route.length} ${route.length === 1 ? "city" : "cities"}`;
    const routeText = model.multi
      ? `${cityCount}:  ${route.join("  >  ")}`
      : `Route:  ${route.join("  >  ")}`;
    block(routeText, { size: 10, color: MUTED, gap: 12, icon: "compass", iconColor: ACCENT });
  }

  if (plan.warning) {
    block(plan.warning, { size: 10, color: AMBER_INK, bg: AMBER_BG, padX: 12, padY: 10, radius: 6, gap: 14, icon: "warning", iconColor: AMBER_INK });
  }

  // Render a "Practical notes" card from a free-form note string. Reused once
  // per country for multi-country routes (each stop keeps its own SIM/apps/
  // connections/tips) and once overall for a single destination. Mirrors the
  // on-screen itinerary: labelled items as accent dot + bold label + value.
  const drawNotesCard = (noteText: string, title: string): void => {
    const cardPadX = 16, cardPadY = 14;
    const titleSize = 8.5, titleH = 16;
    const labelSize = 8, valueSize = 10, valueLH = valueSize * 1.4;
    const rowGap = 9, dotGap = 14, labelGap = 6;
    const innerW = CONTENT_W - cardPadX * 2;
    const contentX = MARGIN + cardPadX;
    const items = parseNoteItems(noteText);
    const single = items.length === 1 && !items[0].label;

    type Row = { label: string; labelW: number; textX: number; firstIndent: number; lines: string[] };
    const rows: Row[] = items.map((item) => {
      if (single || !item.label) {
        const lines = wrap(item.value, valueSize, false, innerW);
        return { label: "", labelW: 0, textX: contentX, firstIndent: 0, lines };
      }
      const label = item.label.toUpperCase();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(labelSize);
      const labelW = doc.getTextWidth(pdfSafe(label));
      const textX = contentX + dotGap;
      const blockW = innerW - dotGap;
      const firstIndent = labelW + labelGap;
      const lines = wrapWithIndent(item.value, valueSize, blockW - firstIndent, blockW);
      return { label, labelW, textX, firstIndent, lines };
    });

    let bodyH = 0;
    rows.forEach((r, i) => { bodyH += r.lines.length * valueLH + (i < rows.length - 1 ? rowGap : 0); });
    const totalH = cardPadY + titleH + bodyH + cardPadY;

    ensureSpace(totalH + 10);
    cursor.y += 4;
    const y0 = cursor.y;

    doc.setFillColor(DAY_BG[0], DAY_BG[1], DAY_BG[2]);
    doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
    doc.setLineWidth(0.75);
    doc.roundedRect(MARGIN, y0, CONTENT_W, totalH, 8, 8, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(titleSize);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(pdfSafe(title).toUpperCase(), contentX, y0 + cardPadY + titleSize * 0.9, { charSpace: 1.2 });

    let ry = y0 + cardPadY + titleH;
    for (const r of rows) {
      const baseline = ry + valueSize * 0.9;
      if (r.label) {
        doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
        doc.circle(contentX + 3, ry + valueSize * 0.5, 1.7, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(labelSize);
        doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        doc.text(r.label, r.textX, baseline, { charSpace: 0.4 });
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(valueSize);
      doc.setTextColor(SLATE[0], SLATE[1], SLATE[2]);
      let ly = baseline;
      r.lines.forEach((line, li) => {
        const lx = li === 0 ? r.textX + r.firstIndent : r.textX;
        doc.text(line, lx, ly);
        ly += valueLH;
      });
      ry += r.lines.length * valueLH + rowGap;
    }
    cursor.y = y0 + totalH + 8;
  };

  // ── Days ──
  if (model.multi) {
    model.sections.forEach((section, i) => {
      drawSectionHeader(section, i);
      for (const day of section.days) drawDayCard(day);
      if (section.note) drawNotesCard(section.note, `Practical notes \u00B7 ${section.name}`);
    });
  } else {
    for (const day of plan.days) drawDayCard(day);
    if (plan.note) drawNotesCard(plan.note, "Practical notes");
  }

  // ── Footer ──
  rule();
  const stamp = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  ensureSpace(30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  const footText = pdfSafe(`Generated by Roamwise  \u00B7  ${stamp}`);
  const footIconS = 11, footGap = 6;
  const footW = doc.getTextWidth(footText);
  const footStartX = PAGE_W / 2 - (footW + footIconS + footGap) / 2;
  drawImageTile(doc, getBrandLogo(), footStartX, cursor.y - footIconS + 2, footIconS - 3);
  doc.text(footText, footStartX + footIconS + footGap, cursor.y + 2);

  // Clickable link so whoever receives the PDF can open the app and plan too.
  const url = appUrl();
  if (url) {
    const linkLabel = pdfSafe(`Plan your own trip \u2192 ${url.replace(/^https?:\/\//, "").replace(/\/$/, "")}`);
    cursor.y += 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    const linkW = doc.getTextWidth(linkLabel);
    const linkX = PAGE_W / 2 - linkW / 2;
    doc.textWithLink(linkLabel, linkX, cursor.y, { url });
  }

  return doc.output("blob");
}
