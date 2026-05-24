import type { TripPlan, DayEntry } from "./tripPlans";
import type { Country } from "../types";

/**
 * Generate a print-friendly HTML document for an itinerary and trigger
 * the browser's print dialog (which offers "Save as PDF" on all platforms).
 * Zero dependencies — pure browser APIs.
 */
export function exportItineraryAsPdf(plan: TripPlan, country: Country, homeCountry: string): void {
  const cityRoute = extractCityRoute(plan.days);
  const html = buildPrintHtml(plan, country, homeCountry, cityRoute);

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

function extractCityRoute(days: DayEntry[]): string[] {
  const cities: string[] = [];
  for (const day of days) {
    const m = day.label.match(/—\s*(.+)$/);
    const city = m ? m[1].trim() : "";
    if (city && cities[cities.length - 1] !== city) cities.push(city);
  }
  return cities;
}

function buildPrintHtml(plan: TripPlan, country: Country, homeCountry: string, cityRoute: string[]): string {
  const daysHtml = plan.days.map((day) => `
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
  `).join("\n");

  const bestMonths = country.bestMonths?.join(", ") ?? "";
  const route = cityRoute.join(" → ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(country.name)} Itinerary — Travel Planner</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.5; }
    h1 { font-size: 28px; font-weight: 800; margin-bottom: 4px; }
    .meta { font-size: 13px; color: #64748b; margin-bottom: 6px; }
    .summary { display: flex; gap: 24px; padding: 12px 16px; background: #f1f5f9; border-radius: 8px; margin: 16px 0; font-size: 13px; font-weight: 600; }
    .summary span { color: #334155; }
    .route { font-size: 12px; color: #64748b; margin-bottom: 20px; }
    .route strong { color: #334155; }
    .day { margin-bottom: 16px; break-inside: avoid; }
    .day-header { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px 6px 0 0; }
    .day-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; }
    .day-theme { font-size: 10px; font-weight: 600; color: #6366f1; background: #eef2ff; padding: 2px 8px; border-radius: 99px; }
    .activities { list-style: none; padding: 10px 12px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 6px 6px; }
    .activities li { font-size: 13px; padding: 4px 0; padding-left: 16px; position: relative; color: #334155; }
    .activities li::before { content: "›"; position: absolute; left: 0; color: #94a3b8; font-weight: bold; }
    .hotels { margin-top: 4px; padding: 6px 12px; }
    .hotel { font-size: 11px; color: #64748b; margin-right: 12px; }
    .note { margin-top: 20px; padding: 12px 16px; background: #f8fafc; border-radius: 8px; font-size: 12px; color: #64748b; border: 1px solid #e2e8f0; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
    ${plan.warning ? `.warning { padding: 8px 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; font-size: 12px; color: #92400e; margin-bottom: 16px; }` : ""}
    @media print {
      body { padding: 20px; }
      .day { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${esc(country.name)}</h1>
  <p class="meta">From ${esc(homeCountry)} · ${esc(country.budget || "")} · Best months: ${esc(bestMonths)}</p>

  <div class="summary">
    <span>📅 ${esc(plan.duration)}</span>
    <span>💰 ${esc(plan.costPerPerson)} / person</span>
    <span>🏙 ${cityRoute.length} cities</span>
  </div>

  ${route ? `<p class="route"><strong>Route:</strong> ${esc(route)}</p>` : ""}
  ${plan.warning ? `<div class="warning">⚠️ ${esc(plan.warning)}</div>` : ""}

  ${daysHtml}

  <div class="note">${esc(plan.note)}</div>
  <div class="footer">Generated by Travel Planner · ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
