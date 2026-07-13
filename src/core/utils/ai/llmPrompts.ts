import type { ChatMessage, TripBrief } from "../../types";

const MAX_RECENT_MESSAGES = 6;

export function buildSystemPrompt(homeCountry: string): string {
  return `You are a helpful travel planning assistant. You help users plan detailed trip itineraries.

ROLE: You are a travel planning assistant that gives actionable, detailed itineraries.

DEFAULTS (use when the user doesn't specify):
- Origin: ${homeCountry}
- Travelers: 2
- Duration: 7 days
- Budget: mid-range
- Cities: your best recommendation for the destination

RESPONSE STRATEGY:
- If the user's request already includes destination, duration, and budget (or enough detail to fill defaults), respond IMMEDIATELY with a complete day-by-day itinerary. Do NOT just acknowledge or ask questions — give the full plan.
- Only ask clarifying questions if the request is genuinely vague (e.g. "plan a trip" with no destination).
- After giving a plan, invite the user to refine: "Want me to adjust anything — different cities, more days, different budget?"

FORMATTING GUIDELINES:
- Structure the response as a day-by-day plan with city names, activities, transport, and costs
- Use bullet points for each day
- When showing costs, use ₹ (INR) as the base currency
- Mention best transport between cities (flight, train, bus, ferry, etc.)
- Suggest popular tours/excursions (Klook, Viator, or local operators) with approximate costs
- Include 2-3 hotel suggestions per city (budget/mid/luxury tiers)

When the user is satisfied and you receive a FINALIZATION request, output ONLY a valid JSON object (no markdown, no backticks, no explanation) matching this exact schema:

{
  "destinationName": "Country or region name",
  "originCountry": "Where the trip starts from",
  "travelers": 2,
  "durationDays": 7,
  "budgetLevel": "budget" | "mid-range" | "luxury",
  "assumptions": ["list of assumptions you made"],
  "cities": [
    {
      "name": "Oslo",
      "lat": 59.9139,
      "lng": 10.7522,
      "nights": 2,
      "transportToNext": {
        "type": "train",
        "label": "Bergen Railway (scenic, 7hrs)",
        "cost": "₹3K"
      }
    },
    {
      "name": "Bergen",
      "lat": 60.3913,
      "lng": 5.3221,
      "nights": 3
    }
  ],
  "meta": {
    "bestMonths": ["June", "July", "August", "September"],
    "worstMonths": ["November", "December", "January"],
    "thingsToAvoid": ["Driving on mountain roads in winter", "Visiting fjords without rain gear"],
    "visaTips": "Schengen visa required for Indian passport holders. Apply 3-4 weeks in advance.",
    "comboCountries": ["Sweden", "Denmark", "Finland"],
    "highlights": ["Fjord cruises", "Northern Lights", "Midnight sun in summer"]
  },
  "plan": {
    "duration": "7 days / 6 nights",
    "costPerPerson": "₹80K – ₹1.2L",
    "note": "One-line summary of the trip",
    "warning": "Optional caveat or tip",
    "days": [
      {
        "label": "Day 1 — Oslo",
        "activities": ["Activity 1", "Activity 2", "Activity 3"],
        "theme": "Arrival & Exploration",
        "hotels": ["Budget: Hotel A (~₹2K/night)", "Mid: Hotel B (~₹5K/night)", "Luxury: Hotel C (~₹12K/night)"],
        "costBreakdown": {
          "flights": "₹15K (Delhi → Oslo, Norwegian Air)",
          "hotels": "₹2K–₹12K/night depending on tier",
          "excursions": "₹3K (city walking tour)",
          "transfers": "₹500 (airport express train)",
          "total": "₹20K–₹30K"
        },
        "bookingSuggestions": [
          "Oslo Fjord Cruise — Viator ~₹4K, 3hrs, 4.6★",
          "Viking Ship Museum Tour — Klook ~₹1.5K, 2hrs, 4.4★"
        ]
      }
    ]
  }
}

IMPORTANT for the JSON:
- "cities" array: include real lat/lng coordinates, number of nights, and transport to the next city (type must be one of: flight, train, ferry, bus, cable-car, drive). Last city has no transportToNext.
- "meta": always include bestMonths, worstMonths, thingsToAvoid, comboCountries, highlights. Include visaTips when relevant.
- "label" MUST follow the format "Day N — CityName" (use em dash —)
- Each day should have 3-5 activities
- Include hotel suggestions ONLY on the first day in each new city (budget/mid/luxury tiers, 2 suggestions per tier)
- "costBreakdown" should appear on days with significant costs (arrival, city changes, excursion days)
- "bookingSuggestions" — max 2 per day, include platform, price, duration, and rating
- "flights" in costBreakdown only on travel/arrival days
- "costPerPerson" should be a range in ₹ format (₹XK – ₹YL)
- "note" should be a brief trip highlight`;
}

export function buildBriefSummary(brief: TripBrief): string {
  const parts: string[] = [];
  parts.push(`Trip: ${brief.originCountry} → ${brief.destinations.join(", ") || "TBD"}`);
  parts.push(`${brief.travelers} travelers, ${brief.durationDays} days, ${brief.budget} budget`);
  if (brief.mandatoryCities.length) parts.push(`Must visit: ${brief.mandatoryCities.join(", ")}`);
  if (brief.preferences.length) parts.push(`Preferences: ${brief.preferences.join(", ")}`);
  if (brief.exclusions.length) parts.push(`Avoid: ${brief.exclusions.join(", ")}`);
  return parts.join(". ") + ".";
}

export function buildFinalizationPrompt(): string {
  return `The user is satisfied with the plan. Now output the FINAL trip plan as a single valid JSON object. Follow the exact schema from your instructions. Output ONLY the JSON — no markdown code fences, no explanation, no extra text. Just the raw JSON object.`;
}

/** One ordered stop of a composed route handed to the AI planner. */
export type AiPlanStop = {
  name: string;
  days: number;
  cities: string[];
  experiences: string[];
  /** Per-person cost range for this stop, at the active basis. */
  budget?: string;
  bestMonths?: string[];
};

/**
 * The order-aware composed route the AI planner should plan — scope-agnostic
 * (no hardcoded "country"; the unit nouns come from the active DestinationSource,
 * so a domestic route of states/cities reads correctly). Built from the same
 * `useReviewRoute` model the Route Canvas, Share, PDF and Cinematic consume, so
 * the AI plans exactly what's on screen. At N=1 the route is a single stop.
 */
export type AiPlanRequest = {
  /** Ordered route identity (tripSignature) — also the AI-plan storage key. */
  signature: string;
  stops: AiPlanStop[];
  totalDays: number;
  /** Composed per-person cost range, at the active basis. */
  cost?: string;
  homeCountry: string;
  /** Human basis label, e.g. "Couple" — omitted when unknown. */
  travelersLabel?: string;
  unitNoun?: string;
  unitNounPlural?: string;
};

/**
 * Build the initial AI planning prompt for a composed route. Pure and
 * unit-testable. A single-stop route reads as a clean single-destination brief
 * (and always contains "Plan a trip to <name>"); a multi-stop route lists every
 * stop in visit order with per-stop cities/focus/budget and a border-crossing
 * note so the model treats inter-unit travel as transport, not itinerary days.
 */
export function buildRoutePlanPrompt(req: AiPlanRequest): string {
  const noun = req.unitNoun ?? "destination";
  const nounPlural = req.unitNounPlural ?? "destinations";
  const multi = req.stops.length > 1;
  const route = req.stops.map((s) => s.name).join(" → ");

  const stopLine = (s: AiPlanStop): string => {
    const parts: string[] = [`~${s.days} day${s.days === 1 ? "" : "s"}`];
    if (s.cities.length) parts.push(`cities: ${s.cities.join(", ")}`);
    if (s.experiences.length) parts.push(`focus: ${s.experiences.join(", ")}`);
    if (s.budget) parts.push(`budget: ${s.budget}`);
    if (s.bestMonths?.length) parts.push(`best months: ${s.bestMonths.join(", ")}`);
    return parts.join("; ");
  };

  const lines: string[] = [];
  const head = req.stops[0]?.name ?? route;
  lines.push(
    multi
      ? `Plan a multi-${noun} trip: ${req.homeCountry} → ${route}.`
      : `Plan a trip to ${head}.`,
  );

  if (multi) {
    lines.push("");
    lines.push(`Visit these ${req.stops.length} ${nounPlural} in this order:`);
    for (const s of req.stops) lines.push(`- ${s.name} — ${stopLine(s)}.`);
    lines.push("");
    lines.push(
      `Include border-crossing transport (flight/train/bus) between each ${noun}; those travel legs are transport, not itinerary days.`,
    );
  } else {
    const s = req.stops[0];
    if (s) {
      if (s.cities.length) lines.push(`Cities to visit: ${s.cities.join(", ")}.`);
      if (s.experiences.length) lines.push(`Experiences: ${s.experiences.join(", ")}.`);
      if (s.budget) lines.push(`Budget: ${s.budget}.`);
      if (s.bestMonths?.length) lines.push(`Best months: ${s.bestMonths.join(", ")}.`);
    }
  }

  const totals: string[] = [`Total: ~${req.totalDays} day${req.totalDays === 1 ? "" : "s"}`];
  if (req.cost) totals.push(`estimated cost ${req.cost}`);
  if (req.travelersLabel) totals.push(`travelers: ${req.travelersLabel}`);
  totals.push(`starting from ${req.homeCountry}`);
  lines.push("");
  lines.push(`${totals.join(", ")}.`);

  return lines.join("\n");
}

/**
 * Condense messages for token efficiency.
 * Strategy: keep system prompt + brief summary + last N messages.
 */
export function condenseMessages(
  allMessages: ChatMessage[],
  brief: TripBrief,
): ChatMessage[] {
  const system = allMessages.filter((m) => m.role === "system");
  const nonSystem = allMessages.filter((m) => m.role !== "system");

  if (nonSystem.length <= MAX_RECENT_MESSAGES) {
    return allMessages;
  }

  const briefMsg: ChatMessage = {
    role: "system",
    content: `Conversation context so far: ${buildBriefSummary(brief)}`,
  };

  const recent = nonSystem.slice(-MAX_RECENT_MESSAGES);
  return [...system, briefMsg, ...recent];
}

export function defaultBrief(homeCountry: string): TripBrief {
  return {
    originCountry: homeCountry,
    destinations: [],
    travelers: 2,
    durationDays: 7,
    budget: "mid-range",
    mandatoryCities: [],
    preferences: [],
    exclusions: [],
  };
}
