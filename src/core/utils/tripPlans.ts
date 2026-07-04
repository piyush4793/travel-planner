import type { Country, CityEntry, PlanStyle } from "../types";
import type { CountryRule } from "../data/itineraryRules";
import { scoreCities, planItinerary } from "./citySelection";
import { budgetForBasis, BUDGET_BASIS_META, DEFAULT_BUDGET_BASIS, type BudgetBasis } from "./budget";

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
  /** Party basis the cost is computed for. Absent for AI plans (per-person). */
  costBasis?: BudgetBasis;
};

/** Basis icon for a plan's cost figure (person icon for AI/per-person plans). */
export function planCostBasisIcon(plan: TripPlan): string {
  return plan.costBasis ? BUDGET_BASIS_META[plan.costBasis].icon : "👤";
}

/** Accessible label for a plan's cost basis — for `title`/`aria-label` only, never rendered as visible text. */
export function planCostBasisLabel(plan: TripPlan): string {
  return plan.costBasis ? BUDGET_BASIS_META[plan.costBasis].long : "per person";
}

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

/**
 * Reduce free-form experience labels to lowercase, singularised keyword tokens
 * (≥4 chars) for loose matching against rule text. E.g. "Street Food" →
 * ["street", "food"], "Temples" → ["temple"].
 */
function experienceTokens(experiences: string[]): string[] {
  const toks = new Set<string>();
  for (const e of experiences) {
    for (const w of e.toLowerCase().split(/[^a-z]+/)) {
      if (w.length >= 4) toks.add(w.replace(/s$/, ""));
    }
  }
  return [...toks];
}

/** Count how many experience tokens appear anywhere in `text`. */
function tokenHits(text: string, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const t = text.toLowerCase();
  let hits = 0;
  for (const tok of tokens) if (t.includes(tok)) hits++;
  return hits;
}

function getRuledItinerary(
  country: Country,
  _style: PlanStyle,
  selectedCities: string[],
  customDays: number,
  rule: CountryRule | undefined,
  basis: BudgetBasis,
  selectedExperiences: string[] = [],
): TripPlan | null {
  const effectiveRule = rule;
  if (!effectiveRule) return null;

  const expTokens = experienceTokens(selectedExperiences);

  // Select cities and allocate days via optimal bounded-knapsack DP.
  // User-picked cities are all kept (allocation only); auto mode may drop cities
  // to best fit the day budget.
  const scored = scoreCities(effectiveRule);
  // Boost cities whose authored content matches the selected experiences so the
  // DP (auto mode) prefers experience-relevant cities. Explicitly picked cities
  // are always kept, so the boost only reshuffles which cities auto mode drops.
  const boosted =
    expTokens.length > 0
      ? scored.map((c) => {
          const cr = effectiveRule.cities[c.name];
          const text = [
            c.name,
            cr.note ?? "",
            ...cr.days.map((d) => `${d.theme} ${d.activities.map((a) => a.name).join(" ")}`),
          ].join(" ");
          const hits = tokenHits(text, expTokens);
          return hits > 0 ? { ...c, value: c.value * (1 + Math.min(0.6, 0.2 * hits)) } : c;
        })
      : scored;
  const pool =
    selectedCities.length > 0
      ? boosted.filter((c) => selectedCities.includes(c.name))
      : boosted;
  if (pool.length === 0) return null;

  const allocation = planItinerary(pool, customDays, {
    includeAll: selectedCities.length > 0,
  });
  if (allocation.length === 0) return null;

  const citiesToVisit = allocation.map((a) => a.name);
  const totalDays = allocation.reduce((s, a) => s + a.days, 0);

  // Build DayEntry array — one entry per calendar day
  const days: DayEntry[] = [];
  let dayIdx = 1;

  for (const a of allocation) {
    const city = effectiveRule.cities[a.name];
    for (let d = 0; d < a.days; d++) {
      const rulePlan = city.days[d] ?? city.days[city.days.length - 1];
      const dayNum = dayIdx + d;
      // Surface experience-matching activities first (stable), then cap at 5.
      const orderedActs =
        expTokens.length > 0
          ? rulePlan.activities
              .map((act, i) => ({ act, i, hits: tokenHits(`${act.name} ${act.tip ?? ""}`, expTokens) }))
              .sort((a, b) => b.hits - a.hits || a.i - b.i)
              .map((x) => x.act)
          : rulePlan.activities;
      days.push({
        label: `Day ${dayNum} — ${a.name}`,
        theme: rulePlan.theme,
        activities: orderedActs
          .slice(0, 5)
          .map((act) => (act.cost ? `${act.name} (${act.cost})` : act.name)),
        hotels: rulePlan.hotels?.slice(0, 2).map((h) => `${h.name} — ${h.budget}`),
      });
    }
    dayIdx += a.days;
  }

  // Cost — scaled from the selected party basis (falls back to country.budget)
  // by trip length relative to the recommended length. At the recommended length
  // the factor is 1, so the plan cost equals that basis's budget chip; longer or
  // shorter trips scale linearly from that single source.
  const basisBudget = budgetForBasis(country, basis);
  const [baseLow, baseHigh] = parseCostRange(basisBudget);
  const recBaseline = getRecRuleDays(effectiveRule) ?? totalDays;
  const scaleFactor = recBaseline > 0 ? Math.max(0.2, totalDays / recBaseline) : 1;
  const costLow = Math.round(baseLow * scaleFactor);
  const costHigh = Math.round(baseHigh * scaleFactor);

  // Warning if the requested days couldn't fit the chosen cities and the trip had
  // to be expanded to each city's minimum stay.
  const warning =
    totalDays > customDays
      ? `⚠️ ${customDays} day${customDays !== 1 ? "s" : ""} is tight for ${allocation.length} ${allocation.length !== 1 ? "cities" : "city"} — expanded to ${totalDays} days (minimum needed).`
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
    costBasis: basis,
  };
}

export function generateTripPlan(
  country: Country,
  style: PlanStyle,
  selectedCities: string[] = [],
  customDays = 7,
  externalRule?: CountryRule | null,
  basis: BudgetBasis = DEFAULT_BUDGET_BASIS,
  selectedExperiences: string[] = [],
): TripPlan {
  // Use explicit rule if provided
  const rule = externalRule;
  if (rule) {
    const ruled = getRuledItinerary(country, style, selectedCities, customDays, rule, basis, selectedExperiences);
    if (ruled) return ruled;
  }

  const exps = country.experiences;
  const cities = country.cities ?? [];
  const [baseLow, baseHigh] = parseCostRange(budgetForBasis(country, basis));
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
        costBasis: basis,
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
      costBasis: basis,
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
      costBasis: basis,
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
    costBasis: basis,
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
