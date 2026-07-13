import type { TripPlan, DayEntry } from "../core/utils/tripPlans";
import type { Country, DietNotes } from "../core/types";
import { buildPdfModel, type PdfModel, type PdfRouteStop, type PdfSection } from "./pdfModel";
import { getCountryFlag } from "./countryFlags";
import { parseNoteItems } from "../core/utils/practicalNotes";
import { appUrl } from "../core/utils/appUrl";
import { BRAND, ACCENT } from "../core/theme/palette";
import { getBrandLogo } from "./brandLogo";

/**
 * Generate a print-friendly HTML document for an itinerary and trigger
 * the browser's print dialog (which offers "Save as PDF" on all platforms).
 * Zero dependencies — pure browser APIs. Works for a single destination or an
 * unbounded multi-stop route (one section per stop) via the shared PDF model.
 */
export function exportItineraryAsPdf(
  plan: TripPlan,
  country: Country,
  homeCountry: string,
  stops?: PdfRouteStop[],
): void {
  const model = buildPdfModel(plan, country, homeCountry, stops);

  // Mobile browsers don't support iframe.print() — open in a new tab that
  // auto-triggers the print/"Save as PDF" dialog and shows a manual button
  // as a fallback when auto-print is blocked.
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.open();
    win.document.write(buildPrintHtml(model, true));
    win.document.close();
    return;
  }

  const html = buildPrintHtml(model, false);
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }

  doc.open();
  doc.write(html);
  doc.close();

  // Wait for styles to apply before printing
  iframe.contentWindow?.addEventListener("afterprint", () => {
    document.body.removeChild(iframe);
  });

  setTimeout(() => {
    iframe.contentWindow?.print();
    // Fallback cleanup if afterprint doesn't fire (some browsers)
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 5000);
  }, 300);
}

/**
 * The full, non-interactive itinerary HTML document — the single source of
 * truth for the itinerary's visual layout. Consumed both by the print-based
 * Export (this file) and by the Share flow (`pdfDocument.ts`), which rasterises
 * it to a real PDF Blob so the shared file is pixel-identical to Export.
 */
export function buildItineraryHtml(
  plan: TripPlan,
  country: Country,
  homeCountry: string,
  stops?: PdfRouteStop[],
): string {
  return buildPrintHtml(buildPdfModel(plan, country, homeCountry, stops), false);
}

function extractCityRoute(days: DayEntry[]): string[] {
  const cities: string[] = [];
  for (const day of days) {
    const m = day.label.match(/—\s*(.+)$/);
    const city = m ? m[1].trim() : "";
    if (city && cities[cities.length - 1] !== city) cities.push(city);
  }
  return cities;
}

function dayHtml(day: DayEntry): string {
  return `
    <div class="day">
      <div class="day-header">
        <span class="day-label">${esc(day.label)}</span>
        ${day.theme ? `<span class="day-theme">${esc(day.theme)}</span>` : ""}
      </div>
      <ul class="activities">
        ${day.activities.map((a) => `<li>${esc(a)}</li>`).join("\n        ")}
      </ul>
      ${day.hotels?.length ? `
      <div class="hotels">
        ${day.hotels.map((h) => `<span class="hotel">🏨 ${esc(h)}</span>`).join(" ")}
      </div>` : ""}
    </div>
  `;
}

/**
 * Render a practical-notes card from a free-form note. Parsed into labelled
 * items so multi-country routes show each stop's own SIM/apps/connections/tips
 * (mirrors the on-screen itinerary + the jsPDF share path).
 */
function notesHtml(note: string, title: string): string {
  const items = parseNoteItems(note);
  const single = items.length === 1 && !items[0].label;
  const inner = single
    ? `<p class="note-value">${esc(items[0].value)}</p>`
    : `<ul class="note-list">${items
        .map((it) => `<li>${it.label ? `<span class="note-label">${esc(it.label)}</span> ` : ""}${esc(it.value)}</li>`)
        .join("")}</ul>`;
  return `<div class="note"><span class="note-title">${esc(title)}</span>${inner}</div>`;
}

/**
 * Render a veg/vegan dietary-guidance card. Emitted per-section for multi-country
 * routes and once for a single destination, only when the stop carries a `diet`
 * block (domestic India today). Scope-agnostic — no rendering change needed for a
 * future scope that adds diet data.
 */
function dietHtml(diet: DietNotes, title: string): string {
  const phrases = diet.phrases.length
    ? `<ul class="note-list">${diet.phrases.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>`
    : "";
  return `<div class="diet"><span class="note-title">${esc(title)}</span>` +
    `<p class="diet-line"><span class="diet-label">🥗 Vegetarian</span> ${esc(diet.vegetarian)}</p>` +
    `<p class="diet-line"><span class="diet-label">🌱 Vegan</span> ${esc(diet.vegan)}</p>` +
    phrases +
    `</div>`;
}

function sectionHtml(section: PdfSection, index: number): string {
  const dayRange = section.dayStart === section.dayEnd
    ? `Day ${section.dayStart}`
    : `Days ${section.dayStart}–${section.dayEnd}`;
  const meta = [
    dayRange,
    section.cost ? `${section.cost} / person` : "",
    section.bestMonths?.length ? `Best: ${section.bestMonths.join(", ")}` : "",
  ].filter(Boolean).join(" · ");
  return `
    <div class="section-header">
      <span class="section-eyebrow">Stop ${index + 1}</span>
      <h2 class="section-name">${esc(getCountryFlag(section.name))} ${esc(section.name)}</h2>
      <p class="section-meta">${esc(meta)}</p>
    </div>
    ${section.days.map(dayHtml).join("\n")}
    ${section.note ? notesHtml(section.note, `Practical notes · ${section.name}`) : ""}
    ${section.diet ? dietHtml(section.diet, `Food & diet · ${section.name}`) : ""}
  `;
}

function buildPrintHtml(model: PdfModel, interactive: boolean): string {
  const allDays = model.sections.flatMap((s) => s.days);
  const cityRoute = extractCityRoute(allDays);
  const route = cityRoute.join(" → ");

  const bodyHtml = model.multi
    ? model.sections.map((s, i) => sectionHtml(s, i)).join("\n")
    : allDays.map(dayHtml).join("\n");

  const bestMonths = (model.sections[0]?.bestMonths ?? []).join(", ");
  const metaLine = model.multi
    ? `From ${esc(model.homeCountry)} · ${model.meta.stopCount} countries · ${esc(model.meta.duration)}`
    : `From ${esc(model.homeCountry)}${bestMonths ? ` · Best months: ${esc(bestMonths)}` : ""}`;

  const summaryHtml = model.multi
    ? `
    <span>📅 ${esc(model.meta.duration)}</span>
    <span>💰 ${esc(model.meta.costPerPerson)} / person</span>
    <span>🧭 ${model.meta.stopCount} countries</span>
    <span>🏙 ${model.meta.cityCount} cities</span>`
    : `
    <span>📅 ${esc(model.meta.duration)}</span>
    <span>💰 ${esc(model.meta.costPerPerson)} / person</span>
    <span>🏙 ${model.meta.cityCount} cities</span>`;

  const interactiveExtras = interactive ? `
  <div class="pdf-actions">
    <button type="button" onclick="window.print()">⬇ Save as PDF</button>
  </div>
  <script>
    window.addEventListener("load", function () {
      setTimeout(function () { try { window.print(); } catch (e) {} }, 600);
    });
  </script>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(model.title)} Itinerary — Roamwise</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1c2b26; background: #faf8f1; padding: 44px; max-width: 800px; margin: 0 auto; line-height: 1.5; position: relative; }
    .eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: ${BRAND[600]}; margin-bottom: 8px; }
    h1 { font-family: ui-serif, Georgia, "Times New Roman", serif; font-size: 32px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 6px; color: ${BRAND[900]}; }
    .meta { font-size: 13px; color: #5b6b64; margin-bottom: 6px; }
    .summary { display: flex; flex-wrap: wrap; gap: 22px; padding: 13px 18px; background: ${BRAND[50]}; border: 1px solid ${BRAND[100]}; border-radius: 10px; margin: 18px 0; font-size: 13px; font-weight: 600; }
    .summary span { color: ${BRAND[800]}; }
    .route { font-size: 12px; color: #5b6b64; margin-bottom: 22px; }
    .route strong { color: ${BRAND[800]}; }
    .section-header { break-inside: avoid; break-after: avoid; margin: 26px 0 14px; padding: 12px 16px; background: ${BRAND[50]}; border-left: 4px solid ${BRAND[600]}; border-radius: 8px; }
    .section-eyebrow { font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: ${BRAND[600]}; }
    .section-name { font-family: ui-serif, Georgia, "Times New Roman", serif; font-size: 19px; font-weight: 700; color: ${BRAND[900]}; margin: 2px 0; }
    .section-meta { font-size: 12px; color: #5b6b64; }
    .day { margin-bottom: 16px; break-inside: avoid; }
    .day-header { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f4f2ea; border: 1px solid #e6e2d5; border-radius: 6px 6px 0 0; }
    .day-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #3f4a44; }
    .day-theme { font-size: 10px; font-weight: 600; color: ${BRAND[700]}; background: ${BRAND[100]}; padding: 2px 8px; border-radius: 99px; }
    .activities { list-style: none; padding: 10px 12px; border: 1px solid #e6e2d5; border-top: none; border-radius: 0 0 6px 6px; background: #fff; }
    .activities li { font-size: 13px; padding: 4px 0; padding-left: 16px; position: relative; color: #33403a; }
    .activities li::before { content: "›"; position: absolute; left: 0; color: ${BRAND[500]}; font-weight: bold; }
    .hotels { margin-top: 4px; padding: 6px 12px; }
    .hotel { font-size: 11px; color: #5b6b64; margin-right: 12px; }
    .note { margin-top: 16px; padding: 12px 16px; background: #f4f2ea; border-radius: 8px; font-size: 12px; color: #5b6b64; border: 1px solid #e6e2d5; }
    .note-title { display: block; font-size: 9px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #5b6b64; margin-bottom: 6px; }
    .note-value { font-size: 12px; color: #33403a; }
    .note-list { list-style: none; padding: 0; }
    .note-list li { font-size: 12px; padding: 3px 0 3px 14px; position: relative; color: #33403a; }
    .note-list li::before { content: "•"; position: absolute; left: 0; color: ${BRAND[500]}; font-weight: bold; }
    .note-label { font-weight: 700; color: #5b6b64; text-transform: uppercase; font-size: 10px; letter-spacing: 0.4px; }
    .diet { margin-top: 16px; padding: 12px 16px; background: ${BRAND[50]}; border-radius: 8px; font-size: 12px; color: #33403a; border: 1px solid #bbf7d0; }
    .diet-line { font-size: 12px; color: #33403a; margin: 4px 0; }
    .diet-label { font-weight: 700; color: ${BRAND[700]}; text-transform: uppercase; font-size: 10px; letter-spacing: 0.4px; }
    .brand { position: absolute; top: 44px; right: 44px; width: 44px; height: 44px; border-radius: 10px; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e6e2d5; font-size: 10px; color: #9aa79f; text-align: center; }
    .footer a { color: ${BRAND[600]}; font-weight: 700; text-decoration: none; }
    .pdf-actions { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); z-index: 9999; }
    .pdf-actions button { font: inherit; font-size: 15px; font-weight: 700; color: #fff; background: ${BRAND[600]}; border: none; border-radius: 999px; padding: 12px 24px; box-shadow: 0 4px 14px ${BRAND[600]}66; cursor: pointer; }
    .pdf-actions button:active { background: ${BRAND[700]}; }
    ${model.warning ? `.warning { padding: 8px 12px; background: ${ACCENT[50]}; border: 1px solid ${ACCENT[200]}; border-radius: 6px; font-size: 12px; color: ${ACCENT[800]}; margin-bottom: 16px; }` : ""}
    @media print {
      body { padding: 20px; background: #fff; }
      .day, .section-header { break-inside: avoid; }
      .pdf-actions { display: none !important; }
    }
  </style>
</head>
<body>
  <img class="brand" src="${getBrandLogo().dataUrl}" alt="Roamwise" />
  <p class="eyebrow">Travel Itinerary</p>
  <h1>${model.multi ? "" : `${esc(getCountryFlag(model.title))} `}${esc(model.title)}</h1>
  <p class="meta">${metaLine}</p>

  <div class="summary">${summaryHtml}</div>

  ${route ? `<p class="route"><strong>Route:</strong> ${esc(route)}</p>` : ""}
  ${model.warning ? `<div class="warning">⚠️ ${esc(model.warning)}</div>` : ""}

  ${bodyHtml}

  ${model.multi ? "" : (model.note ? notesHtml(model.note, "Practical notes") : "")}
  ${model.multi ? "" : (model.sections[0]?.diet ? dietHtml(model.sections[0].diet, "Food & diet") : "")}
  <div class="footer">
    Generated by Roamwise · ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
    ${appUrl() ? `<br /><a href="${appUrl()}">Plan your own trip → ${esc(appUrl().replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a>` : ""}
  </div>
  ${interactiveExtras}
</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
