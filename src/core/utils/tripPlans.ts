import type { Country, CityEntry, PlanStyle } from "../types";
import type { CountryRule } from "../data/itineraryRules";

export type DayEntry = {
  label: string;
  activities: string[];
  theme?: string;
  hotels?: string[];
};

export type TripPlan = {
  duration: string;
  costPerPerson: string;
  days: DayEntry[];
  note: string;
  warning?: string;
};

/** Extract city name from a day label like "Day 1 — Oslo" */
export function extractCityFromLabel(label: string): string {
  const m = label.match(/[—\-–]\s*(.+)$/);
  return m ? m[1].trim() : "";
}

/** Extract unique ordered city route from plan days */
export function extractPlanCities(days: DayEntry[]): string[] {
  const cities: string[] = [];
  for (const day of days) {
    const city = extractCityFromLabel(day.label);
    if (city && cities[cities.length - 1] !== city) cities.push(city);
  }
  return cities;
}

/** Filter out noise entries that aren't real cities (import artifacts) */
export function isRealCity(name: string): boolean {
  return (
    name.length >= 2 &&
    !/^(?:stay:\s|return|departure|depart|transit|arrive|entry costs|recommended hotels|mostly free|fly\s*back)/i.test(name)
  );
}

/** Normalize city name for case-insensitive comparison */
export function normalizeCityName(name: string): string {
  return name.replace(/^stay:\s*/i, "").trim().toLowerCase();
}

function parseCostRange(budget: string | { solo: string; couple: string; family4: string }): [number, number] {
  const str = typeof budget === "string" ? budget : budget.couple;
  const m = str.match(/₹([\d.]+)([KL])[–\-]₹([\d.]+)([KL])/);
  if (!m) return [100000, 200000];
  const toNum = (n: string, u: string) => {
    const v = parseFloat(n);
    return u === "K" ? v * 1000 : v * 100000;
  };
  return [toNum(m[1], m[2]), toNum(m[3], m[4])];
}

function fmt(n: number): string {
  if (n >= 100000) {
    const l = n / 100000;
    return `₹${Number.isInteger(l) ? l : l.toFixed(1)}L`;
  }
  return `₹${Math.round(n / 1000)}K`;
}

function costRange(low: number, high: number): string {
  return `${fmt(low)} – ${fmt(high)}`;
}

function act(exp?: string): string {
  if (!exp) return "Explore at your own pace";
  const lower = exp.toLowerCase();
  if (/museum|gallery|memorial|palace|castle/.test(lower)) return `Visit ${exp}`;
  if (/temple|shrine|monastery|mosque|cathedral|church/.test(lower)) return `Explore ${exp}`;
  if (/food|cuisine|market|street food|tasting|wine|beer|sake/.test(lower)) return `Savour ${exp}`;
  if (/hik|trek|trail|climb|summit/.test(lower)) return `Trek — ${exp}`;
  if (/beach|island|coast|bay|lagoon/.test(lower)) return `Relax at ${exp}`;
  if (/safari|wildlife|national park|reserve/.test(lower)) return `Safari — ${exp}`;
  if (/diving|snorkel|surf|kayak|raft/.test(lower)) return `Try ${exp}`;
  if (/cruise|boat|ferry|canal/.test(lower)) return `Cruise — ${exp}`;
  if (/northern lights|aurora/.test(lower)) return `Chase ${exp}`;
  if (/night ?life|bar|club/.test(lower)) return `Experience ${exp}`;
  return `Discover ${exp}`;
}

function allocateDays(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const extra = total % n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

function cityBlock(city: CityEntry, daysCount: number, dayStart: number, exps: string[]): DayEntry {
  const end = dayStart + daysCount - 1;
  const label = daysCount === 1
    ? `Day ${dayStart} — ${city.name}`
    : `Day ${dayStart}–${end} — ${city.name}`;

  const activities: string[] = [];

  if (city.notes) {
    const highlights = city.notes.split(",").slice(0, 2).map(s => s.trim());
    activities.push(`Explore: ${highlights[0]}`);
    if (highlights[1]) activities.push(`Visit: ${highlights[1]}`);
  } else {
    activities.push(`Arrive in ${city.name} and orient yourself`);
    activities.push(act(exps[0] ?? city.name));
  }

  if (daysCount >= 2) activities.push(`Day ${dayStart + 1}: local food, markets and hidden gems`);
  if (daysCount >= 3) activities.push(act(exps[1] ?? "local neighbourhood walk"));
  if (daysCount >= 4) activities.push(`Day ${dayStart + 3}: day trip from ${city.name}`);

  return { label, activities };
}

function cityBasedPlan(
  country: Country,
  selectedCities: string[],
  totalDays: number,
  costLow: number,
  costHigh: number,
  warning?: string,
): TripPlan {
  const cityObjs = country.cities ?? [];
  const chosen = selectedCities
    .map(n => cityObjs.find(c => c.name === n))
    .filter((c): c is CityEntry => c !== undefined);

  const perCity = allocateDays(totalDays, chosen.length);
  const days: DayEntry[] = [];
  let dayIdx = 1;

  chosen.forEach((city, i) => {
    days.push(cityBlock(city, perCity[i], dayIdx, country.experiences));
    dayIdx += perCity[i];
  });

  const bestTime = country.bestMonths.slice(0, 3).join(", ");
  const avgPerCity = (totalDays / chosen.length).toFixed(1);

  return {
    duration: `${totalDays} day${totalDays !== 1 ? "s" : ""}`,
    costPerPerson: costRange(costLow, costHigh),
    days,
    note: `~${avgPerCity} days per city. Best months: ${bestTime}.`,
    warning,
  };
}

/**
 * Smart city selection: given N available days, pick the best subset of cities
 * that fits. Prioritizes by recDays (higher = more important), drops lowest-priority
 * cities first until the trip fits within the day budget.
 */
function selectCitiesForDays(rule: CountryRule, days: number): string[] {
  const allCities = rule.cityOrder.filter((c) => rule.cities[c]);
  const minTotal = allCities.reduce((s, c) => s + rule.cities[c].minDays, 0);

  // If days can fit all cities at their minimum, include all
  if (days >= minTotal) return allCities;

  // Otherwise, greedily add cities in order until budget exhausted
  // Priority: cities with higher recDays are more important to keep
  const sorted = [...allCities].sort((a, b) => rule.cities[b].recDays - rule.cities[a].recDays);
  const selected: string[] = [];
  let remaining = days;

  for (const city of sorted) {
    const minDays = rule.cities[city].minDays;
    if (remaining >= minDays) {
      selected.push(city);
      remaining -= minDays;
    }
  }

  // Restore original route order
  return rule.cityOrder.filter((c) => selected.includes(c));
}

/** Calculate the max useful days from a loaded rule */
export function getMaxRuleDays(rule: CountryRule | null | undefined): number | null {
  if (!rule) return null;
  return rule.cityOrder
    .filter((c) => rule.cities[c])
    .reduce((s, c) => s + rule.cities[c].maxDays, 0);
}

/** Calculate the recommended days from a loaded rule */
export function getRecRuleDays(rule: CountryRule | null | undefined): number | null {
  if (!rule) return null;
  return rule.cityOrder
    .filter((c) => rule.cities[c])
    .reduce((s, c) => s + rule.cities[c].recDays, 0);
}

function getRuledItinerary(
  country: Country,
  _style: PlanStyle,
  selectedCities: string[],
  customDays: number,
  rule?: CountryRule,
): TripPlan | null {
  const effectiveRule = rule;
  if (!effectiveRule) return null;

  // Determine which cities to visit — user selection or smart auto-selection
  let citiesToVisit: string[];
  if (selectedCities.length > 0) {
    citiesToVisit = effectiveRule.cityOrder.filter((c) => selectedCities.includes(c));
  } else {
    citiesToVisit = selectCitiesForDays(effectiveRule, customDays);
  }

  const cityRules = citiesToVisit
    .map((n) => effectiveRule.cities[n])
    .filter((c): c is NonNullable<typeof c> => c !== undefined);

  if (!cityRules.length) return null;

  // Allocate days per city proportionally, clamped to min/max
  const recTotal = cityRules.reduce((s, c) => s + c.recDays, 0);
  const totalDays = customDays;

  let allocs = cityRules.map((c) =>
    Math.max(c.minDays, Math.min(c.maxDays, Math.round(totalDays * (c.recDays / recTotal))))
  );

  // Fix rounding drift
  let allocated = allocs.reduce((a, b) => a + b, 0);
  let passes = 0;
  while (allocated !== totalDays && passes++ < 20) {
    if (allocated < totalDays) {
      const i = allocs.findIndex((a, idx) => a < cityRules[idx].maxDays);
      if (i === -1) break;
      allocs[i]++;
    } else {
      let i = allocs.length - 1;
      while (i >= 0 && allocs[i] <= cityRules[i].minDays) i--;
      if (i === -1) break;
      allocs[i]--;
    }
    allocated = allocs.reduce((a, b) => a + b, 0);
  }

  // Build DayEntry array — one entry per calendar day
  const days: DayEntry[] = [];
  let dayIdx = 1;

  cityRules.forEach((city, ci) => {
    const numDays = allocs[ci];
    for (let d = 0; d < numDays; d++) {
      const rulePlan = city.days[d] ?? city.days[city.days.length - 1];
      const dayNum = dayIdx + d;
      days.push({
        label: `Day ${dayNum} — ${city.name}`,
        theme: rulePlan.theme,
        activities: rulePlan.activities
          .slice(0, 5)
          .map((a) => (a.cost ? `${a.name} (${a.cost})` : a.name)),
        hotels: rulePlan.hotels?.slice(0, 2).map((h) => `${h.name} — ${h.budget}`),
      });
    }
    dayIdx += numDays;
  });

  // Cost — scale proportionally to trip length
  const [baseLow, baseHigh] = parseCostRange(country.budget);
  const scaleFactor = Math.max(0.3, totalDays / 10);
  const costLow = Math.round(baseLow * scaleFactor);
  const costHigh = Math.round(baseHigh * scaleFactor);

  // Warning if days are tight
  const minTotal = cityRules.reduce((s, c) => s + c.minDays, 0);
  const warning =
    totalDays < minTotal
      ? `⚠️ ${totalDays} days is tight for ${cityRules.length} cities — consider at least ${minTotal} days.`
      : undefined;

  // Note: key connections + practical tips
  const connParts: string[] = [];
  for (let i = 0; i < citiesToVisit.length - 1; i++) {
    const conn = effectiveRule.connections.find(
      (c) => c.from === citiesToVisit[i] && c.to === citiesToVisit[i + 1]
    );
    if (conn) {
      const from = citiesToVisit[i].split(" ")[0];
      const to = citiesToVisit[i + 1].split(" ")[0];
      connParts.push(`${from} → ${to}: ${conn.method}${conn.cost ? ` (${conn.cost})` : ""}`);
    }
  }
  const tips = [
    effectiveRule.sim ? `SIM: ${effectiveRule.sim}` : "",
    effectiveRule.apps?.length ? effectiveRule.apps.slice(0, 3).join(" · ") : "",
    effectiveRule.extras?.length ? `Extras: ${effectiveRule.extras.slice(0, 3).join(", ")}` : "",
  ].filter(Boolean);

  const note = [...connParts.slice(0, 3), ...tips].join(" | ");

  return {
    duration: `${totalDays} day${totalDays !== 1 ? "s" : ""}`,
    costPerPerson: costRange(costLow, costHigh),
    days,
    note,
    warning,
  };
}

export function generateTripPlan(
  country: Country,
  style: PlanStyle,
  selectedCities: string[] = [],
  customDays = 7,
  externalRule?: CountryRule | null,
): TripPlan {
  // Use explicit rule if provided
  const rule = externalRule;
  if (rule) {
    const ruled = getRuledItinerary(country, style, selectedCities, customDays, rule);
    if (ruled) return ruled;
  }

  const exps = country.experiences;
  const cities = country.cities ?? [];
  const [baseLow, baseHigh] = parseCostRange(country.budget);
  const landmark = country.landmark ?? exps[0] ?? country.name;
  const comboSuggestion = country.combo?.slice(0, 2).join(" & ") ?? "nearby countries";
  const bestTime = country.bestMonths.slice(0, 3).join(", ");

  // ── Custom style ─────────────────────────────────────────────────────────
  if (style === "custom") {
    const scaleFactor = customDays / 10;
    const low = Math.round(baseLow * Math.max(0.3, scaleFactor));
    const high = Math.round(baseHigh * Math.max(0.4, scaleFactor));

    if (selectedCities.length === 0) {
      // No cities selected — generic day-count plan
      const weeks = Math.floor(customDays / 7);
      const remainder = customDays % 7;
      const dayChunks: DayEntry[] = [];

      if (weeks > 0) {
        dayChunks.push({
          label: `Day 1–${Math.min(7, customDays)} — Arrival & Core Highlights`,
          activities: [
            `Arrive, check in, first look at ${landmark}`,
            act(exps[0] ?? landmark),
            act(exps[1] ?? exps[0]),
          ],
        });
      }
      if (weeks > 1) {
        dayChunks.push({
          label: `Day 8–${Math.min(14, customDays)} — Deeper Exploration`,
          activities: exps.slice(2, 5).map(act),
        });
      }
      if (weeks > 2 || remainder > 0) {
        dayChunks.push({
          label: `Day ${customDays - Math.min(2, customDays - 1)}–${customDays} — Final Days`,
          activities: [
            exps.length > 5 ? act(exps[5]) : "Revisit your favourite spot",
            "Local food run and last-minute shopping",
            "Depart",
          ],
        });
      }
      if (dayChunks.length === 0) {
        dayChunks.push({
          label: `Day 1–${customDays} — Your Trip`,
          activities: [act(exps[0] ?? landmark), act(exps[1] ?? exps[0]), "Explore at your own pace"],
        });
      }

      return {
        duration: `${customDays} day${customDays !== 1 ? "s" : ""}`,
        costPerPerson: costRange(low, high),
        days: dayChunks,
        note: `Flexible custom itinerary. Best months: ${bestTime}.`,
      };
    }

    // Cities selected
    const minDays = selectedCities.length;
    const warning = customDays < minDays
      ? `⚠️ ${customDays} days is tight for ${selectedCities.length} cities — consider adding ${minDays - customDays} more day${minDays - customDays !== 1 ? "s" : ""} or dropping a city.`
      : undefined;

    return cityBasedPlan(country, selectedCities, Math.max(customDays, minDays), low, high, warning);
  }

  // ── Touch & Go ───────────────────────────────────────────────────────────
  if (style === "touch-and-go") {
    const totalDays = 4;
    const low = Math.round(baseLow * 0.38);
    const high = Math.round(baseHigh * 0.52);

    if (selectedCities.length > 0) {
      const warning = selectedCities.length > 3
        ? `⚠️ ${selectedCities.length} cities in ~4 days is rushed — Touch & Go works best with 1–3 cities.`
        : undefined;
      return cityBasedPlan(country, selectedCities, totalDays, low, high, warning);
    }

    return {
      duration: "3 – 4 days",
      costPerPerson: costRange(low, high),
      days: [
        {
          label: "Day 1 — Arrive & First Look",
          activities: [
            "Arrive, check in, shake off the flight",
            act(exps[0] ?? landmark),
            `Evening: ${act(exps[1] ?? "local neighbourhood stroll")}`,
          ],
        },
        {
          label: "Day 2 — Main Highlights",
          activities: [
            `${act(exps[2] ?? landmark)} — the centrepiece`,
            act(exps[3] ?? exps[0]),
            "Afternoon: street food or souvenir run",
          ],
        },
        {
          label: "Day 3 – 4 — Last Bites & Depart",
          activities: [
            act(exps[4] ?? exps[1] ?? "final iconic spot"),
            "Quick last-minute shopping",
            `Depart — pair with ${comboSuggestion} for a multi-country run`,
          ],
        },
      ],
      note: `Best for a quick stopover or long weekend. Fly in and squeeze the highlights before moving on to ${comboSuggestion}.`,
    };
  }

  // ── Explorer ─────────────────────────────────────────────────────────────
  if (style === "explorer") {
    const totalDays = 10;
    const low = baseLow;
    const high = baseHigh;

    if (selectedCities.length > 0) {
      const warning = selectedCities.length > 8
        ? `⚠️ ${selectedCities.length} cities across ~10 days will feel rushed. Consider trimming to 4–6 cities.`
        : undefined;
      return cityBasedPlan(country, selectedCities, totalDays, low, high, warning);
    }

    const half = Math.ceil(exps.length / 2);
    const firstHalf = exps.slice(0, half);
    const secondHalf = exps.slice(half);
    const cityDays = cities
      .slice(0, 2)
      .map((c) => `Day trip to ${c.name}${c.notes ? ` — ${c.notes.split(",")[0]}` : ""}`);

    return {
      duration: "7 – 12 days",
      costPerPerson: costRange(low, high),
      days: [
        {
          label: "Day 1 – 2 — Arrival & City Base",
          activities: ["Settle in, orient yourself", act(firstHalf[0] ?? landmark), act(firstHalf[1] ?? exps[0])],
        },
        {
          label: "Day 3 – 5 — Core Attractions",
          activities: [...firstHalf.slice(2).map(act), `Full day at ${landmark}`],
        },
        {
          label: "Day 6 – 9 — Deeper Exploration",
          activities: [...secondHalf.slice(0, 4).map(act), ...cityDays],
        },
        {
          label: "Day 10 – 12 — Wind Down & Depart",
          activities: [
            secondHalf.length > 4 ? act(secondHalf[4]) : "Revisit your favourite spot",
            "Local neighbourhood walk, final dinner",
            "Depart",
          ],
        },
      ],
      note: `Ideal for a proper holiday covering the full country. Best months: ${bestTime}.`,
    };
  }

  // ── Month Long ───────────────────────────────────────────────────────────
  const totalDays = 30;
  const low = Math.round(baseLow * 1.8);
  const high = Math.round(baseHigh * 2.2);

  if (selectedCities.length > 0) {
    return cityBasedPlan(country, selectedCities, totalDays, low, high);
  }

  const regionEntries =
    cities.length > 0
      ? cities.map((c) => `${c.name}${c.notes ? ` (${c.notes.split(",")[0]})` : ""}`)
      : [`Rural ${country.name}`, "Smaller towns", "Local villages"];

  return {
    duration: "30 days",
    costPerPerson: costRange(low, high),
    days: [
      {
        label: "Week 1 — Capital Deep Dive",
        activities: [
          "Secure a monthly rental — cut hotel costs significantly",
          ...exps.slice(0, 3).map(act),
          "Groceries, local cafés, neighbourhood routines",
        ],
      },
      {
        label: "Week 2 — Regional Cities",
        activities: [
          ...regionEntries.slice(0, 3).map((r) => `Explore ${r}`),
          ...exps.slice(3, 5).map(act),
        ],
      },
      {
        label: "Week 3 — Off the Beaten Path",
        activities: [
          ...exps.slice(5).map(act),
          regionEntries.length > 3 ? `Visit ${regionEntries[3]}` : "Rural day trips",
          "Cooking class & local market tour",
          "Cultural event or local festival",
        ],
      },
      {
        label: "Week 4 — Slow Living & Depart",
        activities: [
          "Revisit your favourite corner of the country",
          country.combo?.length ? `Day trip to ${country.combo[0]}` : "Countryside or coastal escape",
          "Final meals, wrap up, pack",
          `Continue to ${comboSuggestion} — or just stay longer`,
        ],
      },
    ],
    note: `Monthly rentals save 40–50% on accommodation. Works well for remote workers. Best months: ${bestTime}.`,
  };
}
