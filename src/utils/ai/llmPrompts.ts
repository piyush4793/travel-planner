import type { ChatMessage, TripBrief } from "../../types";

const MAX_RECENT_MESSAGES = 6;

export function buildSystemPrompt(homeCountry: string): string {
  return `You are a helpful travel planning assistant. You help users plan detailed trip itineraries.

ROLE: Engage in a natural conversation to understand the user's travel needs, then help them build a great plan.

DEFAULTS (use when the user doesn't specify):
- Origin: ${homeCountry}
- Travelers: 2
- Duration: 7 days
- Budget: mid-range
- Cities: your best recommendation for the destination

CONVERSATION GUIDELINES:
- Ask clarifying questions if the user's request is vague
- Suggest cities, activities, and day-by-day breakdowns
- Include practical tips: transport between cities, estimated costs, hotel tier suggestions
- Be concise but informative — use bullet points for day plans
- When showing costs, use ₹ (INR) as the base currency
- Mention best transport options between cities (flight, train, bus, ferry, etc.)

When the user is satisfied and you receive a FINALIZATION request, output ONLY a valid JSON object (no markdown, no backticks, no explanation) matching this exact schema:

{
  "destinationName": "Country or region name",
  "originCountry": "Where the trip starts from",
  "travelers": 2,
  "durationDays": 7,
  "budgetLevel": "budget" | "mid-range" | "luxury",
  "assumptions": ["list of assumptions you made"],
  "plan": {
    "duration": "7 days / 6 nights",
    "costPerPerson": "₹80K – ₹1.2L",
    "note": "One-line summary of the trip",
    "warning": "Optional caveat or tip",
    "days": [
      {
        "label": "Day 1 — CityName",
        "activities": ["Activity 1", "Activity 2", "Activity 3"],
        "theme": "Arrival & Exploration",
        "hotels": ["Budget: Hotel A (~₹2K/night)", "Mid: Hotel B (~₹5K/night)", "Luxury: Hotel C (~₹12K/night)"]
      }
    ]
  }
}

IMPORTANT for the JSON:
- "label" MUST follow the format "Day N — CityName" (use em dash —)
- Each day should have 3-5 activities
- Include 2-3 hotel suggestions per city (budget/mid/luxury) in the first day of each city
- The "note" should be a brief trip highlight
- "costPerPerson" should be a range in ₹ format (₹XK – ₹YL)`;
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
