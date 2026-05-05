import type { Country, CityEntry, PlanStyle } from "../types";

export type DayEntry = {
  label: string;
  activities: string[];
};

export type TripPlan = {
  duration: string;
  costPerPerson: string;
  days: DayEntry[];
  note: string;
  warning?: string;
};

function parseCostRange(budget: string): [number, number] {
  const m = budget.match(/₹([\d.]+)([KL])[–\-]₹([\d.]+)([KL])/);
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

function act(exp: string): string {
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

export function generateTripPlan(
  country: Country,
  style: PlanStyle,
  selectedCities: string[] = [],
  customDays = 7,
): TripPlan {
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
