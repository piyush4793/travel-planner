import { extractTripPlanResult, type LLMTripPlanResult, type LLMTripPlan } from "./ai/llmTransform";
import type { TripPlan, DayEntry } from "./tripPlans";

export type ImportResult = {
  plan: TripPlan;
  destinationName: string;
  durationDays: number;
  cities: string[];
  warnings: string[];
  promptSuggestions: string[];
};

/** Convert an ImportResult to LLMTripPlanResult for reuse with the save/compare flow */
export function importResultToLLM(r: ImportResult, homeCountry: string): LLMTripPlanResult {
  const llmPlan: LLMTripPlan = {
    duration: r.plan.duration,
    costPerPerson: r.plan.costPerPerson,
    note: r.plan.note,
    warning: r.plan.warning,
    days: r.plan.days.map((d) => ({
      label: d.label,
      activities: d.activities,
      theme: d.theme,
      hotels: d.hotels,
    })),
  };
  return {
    destinationName: r.destinationName,
    originCountry: homeCountry,
    travelers: 2,
    durationDays: r.durationDays,
    budgetLevel: "mid-range",
    assumptions: ["Imported from external AI conversation"],
    cities: r.cities.map((name) => ({ name, lat: 0, lng: 0, nights: Math.max(1, Math.floor(r.durationDays / r.cities.length)) })),
    meta: { bestMonths: [], worstMonths: [], thingsToAvoid: [], comboCountries: [], highlights: [] },
    plan: llmPlan,
  };
}

/**
 * Parse imported text into a TripPlan. Tries multiple strategies:
 * 1. JSON (our LLM schema)
 * 2. Structured day-by-day text
 * 3. Full chat conversation extraction
 */
export function parseImportedText(text: string): ImportResult | { error: string } {
  const trimmed = text.trim();
  if (!trimmed) return { error: "Please paste some text to import." };

  // Strategy 1: Try JSON parse (our LLM format)
  const jsonResult = tryJsonParse(trimmed);
  if (jsonResult) return buildResult(jsonResult);

  // Strategy 2: Try structured day-by-day parse
  const structured = tryStructuredParse(trimmed);
  if (structured) return structured;

  // Strategy 3: Try extracting itinerary from full chat
  const chat = tryChatParse(trimmed);
  if (chat) return chat;

  return { error: "Could not find a trip itinerary in the pasted text. Try pasting just the day-by-day plan." };
}

// ── Strategy 1: JSON ──────────────────────────────────────────────────────

function tryJsonParse(text: string): LLMTripPlanResult | null {
  const { result } = extractTripPlanResult(text);
  return result;
}

function buildResult(r: LLMTripPlanResult): ImportResult {
  const cities = r.cities.map((c) => c.name);
  const { warnings, promptSuggestions } = analyzeGaps(r.plan, cities, r.budgetLevel, r.plan.costPerPerson);
  return {
    plan: r.plan,
    destinationName: r.destinationName,
    durationDays: r.durationDays,
    cities,
    warnings,
    promptSuggestions,
  };
}

// ── Strategy 2: Structured day-by-day ─────────────────────────────────────

function tryStructuredParse(text: string): ImportResult | null {
  // Split text into blocks at each "Day N" marker
  const dayStarts: { dayNum: string; endNum?: string; startIdx: number }[] = [];
  const headerRe = /(?:^|\n)\s*(?:\*{0,2})(?:day|día|###\s*day)\s*(\d+)(?:\s*[-–—:to]\s*(\d+))?/gi;
  let hm;
  while ((hm = headerRe.exec(text)) !== null) {
    dayStarts.push({ dayNum: hm[1], endNum: hm[2], startIdx: hm.index });
  }
  if (dayStarts.length < 2) return null;

  const days: DayEntry[] = [];
  const citySet = new Set<string>();

  // Noise patterns: lines that are section headers, not real activities
  const noiseRe = /^(?:stay\s*:|time\s*required\s*:|activities?\s*:|tip\s*:|note\s*:|transport\s*:|budget\s*:|hotel\s*:|accommodation\s*:|cost\s*:|estimated\s*cost|overview\s*:|travel\s*:|getting\s*there|---)/i;
  // Labels to strip from city names
  const cityPrefixRe = /^(?:arrive\s+(?:in|at)\s+|depart(?:ure)?\s*(?:from\s+)?|travel\s+to\s+|fly\s+to\s+|return\s*(?:to\s+)?|head\s+to\s+|move\s+to\s+)/i;

  for (let i = 0; i < dayStarts.length; i++) {
    const start = dayStarts[i].startIdx;
    const end = i + 1 < dayStarts.length ? dayStarts[i + 1].startIdx : text.length;
    const block = text.slice(start, end).trim();
    const dayStart = parseInt(dayStarts[i].dayNum);
    const dayEnd = dayStarts[i].endNum ? parseInt(dayStarts[i].endNum!) : dayStart;

    // First line has the header — extract city from it
    const firstLine = block.split("\n")[0];
    // Try multiple city extraction patterns
    const cityPatterns = [
      /→\s*([A-Z][a-zA-Zà-ÿ\s]+?)(?:\s*[→:(]|$)/,       // Day 3 → Oslo → Flam
      /[-–—]\s*([A-Z][a-zA-Zà-ÿ\s]+?)(?:\s*[:→(]|$)/,    // Day 1 — Oslo: ...
      /:\s*([A-Z][a-zA-Zà-ÿ\s]+?)(?:\s*[-–(]|$)/,        // Day 3: Oslo
      /\d+\)?[-–—:.\s]+([A-Z][a-zA-Zà-ÿ\s]+?)(?:\s*[-–:(]|$)/, // Day 1) Oslo
    ];
    let city = "";
    for (const p of cityPatterns) {
      const m = firstLine.match(p);
      if (m) { city = m[1].trim().split(/[→/]/).pop()?.trim() ?? ""; break; }
    }
    // Fallback: if header is just "### Day 1" check the next line for city name
    if (!city) {
      const nextLine = block.split("\n")[1]?.trim() ?? "";
      if (nextLine && /^[A-Z]/.test(nextLine) && nextLine.length < 30) city = nextLine;
    }

    // Clean city name: remove "ARRIVE IN", "RETURN", "DEPART FROM" etc.
    city = city.replace(cityPrefixRe, "").trim();
    // Skip non-city labels like "RETURN", "DEPARTURE", etc.
    if (/^(?:return|departure|depart|fly\s*back|travel\s*day|transit)$/i.test(city)) city = "";

    if (city) citySet.add(city);

    // Rest of the block = activities (skip first line)
    const bodyLines = block.split("\n").slice(1);
    let activities = bodyLines
      .map((l) => l.replace(/^\s*[-•*\d.)\s]+/, "").trim())
      .filter((l) =>
        l.length > 3 &&
        !l.startsWith("#") &&
        !l.startsWith("---") &&
        !noiseRe.test(l) &&
        // Filter out "Stay:" lines (hotel info, not activities)
        !/^stay\s*:/i.test(l)
      )
      .slice(0, 8);

    // If no body lines, extract activities from the first line (after city: activities,...)
    if (activities.length === 0) {
      const afterCity = firstLine.replace(/.*?:\s*/, "");
      if (afterCity && afterCity !== firstLine) {
        activities = afterCity.split(/[,;]/).map((a) => a.trim()).filter((a) => a.length > 3);
      }
    }

    const label = dayStart === dayEnd
      ? `Day ${dayStart}${city ? ` — ${city}` : ""}`
      : `Day ${dayStart}–${dayEnd}${city ? ` — ${city}` : ""}`;

    days.push({ label, activities: activities.length > 0 ? activities : [`Explore ${city || "the area"}`] });
  }

  if (days.length === 0) return null;

  const cities = [...citySet];
  const totalDays = days.length;

  // Derive destination from the text — look for country/region name first
  const destination = deriveDestination(text, cities);

  // Try to extract cost from text
  const costMatch = text.match(/(?:₹|Rs\.?|USD|\$|€|£)\s?[\d,.]+(?:\s?[KkLl])?(?:\s?[-–]\s?(?:₹|Rs\.?|USD|\$|€|£)\s?[\d,.]+(?:\s?[KkLl])?)?/);
  const cost = costMatch ? costMatch[0] : "Not specified";

  const plan: TripPlan = {
    duration: `${totalDays} days`,
    costPerPerson: cost,
    days,
    note: `Imported plan · ${cities.length} cities · ${totalDays} days`,
  };

  const { warnings, promptSuggestions } = analyzeGaps(plan, cities, undefined, cost);
  return { plan, destinationName: destination, durationDays: totalDays, cities, warnings, promptSuggestions };
}

/** Try to derive a country/region name from the text, falling back to first city */
function deriveDestination(text: string, cities: string[]): string {
  // Common patterns: "trip to Norway", "Norway itinerary", "15 days in Japan"
  const patterns = [
    /(?:trip|travel|itinerary|plan|guide|vacation|holiday)\s+(?:to|in|for|across)\s+([A-Z][a-zA-Zà-ÿ\s]{2,25})/i,
    /([A-Z][a-zA-Zà-ÿ\s]{2,25})\s+(?:trip|travel|itinerary|plan|guide|vacation|holiday)/i,
    /\d+\s*days?\s+in\s+([A-Z][a-zA-Zà-ÿ\s]{2,25})/i,
    /exploring\s+([A-Z][a-zA-Zà-ÿ\s]{2,25})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const name = m[1].trim();
      // Skip if the extracted name looks like a city header or day label
      if (!/^day\s/i.test(name) && name.length >= 3) return name;
    }
  }
  return cities[0] ?? "Trip";
}

// ── Strategy 3: Extract from full chat ────────────────────────────────────

function tryChatParse(text: string): ImportResult | null {
  // Look for the longest assistant response that contains day-by-day patterns
  // Common patterns: "Day 1", "Day 1:", "**Day 1**"
  const dayMentions = text.match(/(?:day|día)\s*\d+/gi);
  if (!dayMentions || dayMentions.length < 2) return null;

  // Find the section with the most "Day N" mentions — that's likely the itinerary
  const lines = text.split("\n");
  let bestStart = 0;
  let bestEnd = lines.length;
  let bestCount = 0;

  for (let i = 0; i < lines.length; i++) {
    let count = 0;
    for (let j = i; j < Math.min(i + 100, lines.length); j++) {
      if (/(?:day|día)\s*\d+/i.test(lines[j])) count++;
    }
    if (count > bestCount) {
      bestCount = count;
      bestStart = i;
      // Find end — where day mentions stop
      let lastDay = i;
      for (let j = i; j < Math.min(i + 100, lines.length); j++) {
        if (/(?:day|día)\s*\d+/i.test(lines[j])) lastDay = j;
      }
      bestEnd = lastDay + 5; // include a few lines after last day
    }
  }

  const itinerarySection = lines.slice(bestStart, bestEnd).join("\n");
  return tryStructuredParse(itinerarySection);
}

// ── Gap analysis + prompt suggestions ─────────────────────────────────────

function analyzeGaps(
  plan: TripPlan,
  cities: string[],
  _budget?: string,
  cost?: string,
): { warnings: string[]; promptSuggestions: string[] } {
  const warnings: string[] = [];
  const promptSuggestions: string[] = [];
  const allText = plan.days.map((d) => d.activities.join(" ")).join(" ").toLowerCase();

  if (!cost || cost === "Not specified" || cost.includes("Not specified")) {
    warnings.push("No budget/cost information found");
    promptSuggestions.push("Ask: 'What's the estimated budget per person including flights and hotels?'");
  }

  const hasHotels = plan.days.some((d) => d.hotels?.length);
  if (!hasHotels && !allText.includes("hotel") && !allText.includes("stay") && !allText.includes("accommodation")) {
    warnings.push("No hotel recommendations found");
    promptSuggestions.push("Ask: 'Recommend hotels for each city with price ranges'");
  }

  if (!allText.includes("train") && !allText.includes("bus") && !allText.includes("flight") && !allText.includes("drive") && !allText.includes("ferry") && !allText.includes("transport")) {
    warnings.push("No transport details between cities");
    promptSuggestions.push("Ask: 'What's the best way to travel between each city and how much does it cost?'");
  }

  if (cities.length <= 1) {
    warnings.push("Only one city detected");
    promptSuggestions.push("Ask: 'Which other cities should I visit and how many days in each?'");
  }

  if (plan.days.length < 3) {
    warnings.push("Very short itinerary — may be incomplete");
    promptSuggestions.push("Ask: 'Give me a detailed day-by-day itinerary for the full trip'");
  }

  const avgActivities = plan.days.reduce((s, d) => s + d.activities.length, 0) / plan.days.length;
  if (avgActivities < 2) {
    warnings.push("Activities seem sparse");
    promptSuggestions.push("Ask: 'List 3-4 specific activities per day with entry costs and timing'");
  }

  if (promptSuggestions.length === 0) {
    promptSuggestions.push("Tip: Ask 'Give me the itinerary as a structured JSON' for a more reliable import next time");
  }

  return { warnings, promptSuggestions };
}

// ── Chat link fetching ────────────────────────────────────────────────────

const CORS_PROXY = "https://api.codetabs.com/v1/proxy/?quest=";

/** Clean ChatGPT HTML artifacts: unescape JSON, remove entity/image/cite markers */
function cleanChatGPTText(html: string): string {
  return html
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, " ")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    // Remove ChatGPT entity markers (both escaped and unescaped variants)
    .replace(/entity\[\\?"[^"]*\\?",\\?"([^"\\]*)\\?"(?:,\\?"[^"\\]*\\?")?\]/g, "$1")
    .replace(/entity\["[^"]*","([^"]*)"(?:,"[^"]*")?\]/g, "$1")
    // Remove image_group{...} blocks
    .replace(/image_group\{[^}]*\}/g, "")
    // Remove cite markers: citeturn0search1 etc
    .replace(/citeturn\d+\w*/g, "")
    // Clean up trailing backslashes from line endings
    .replace(/\\\s*\n/g, "\n")
    // Clean up multiple blank lines
    .replace(/\n{3,}/g, "\n\n");
}

/**
 * Fetch a shared ChatGPT/Claude conversation link and extract text.
 * Uses a CORS proxy since browsers can't fetch these directly.
 * Returns the conversation text or an error message.
 */
export async function fetchChatLink(url: string): Promise<{ text: string } | { error: string }> {
  const trimmed = url.trim();

  // Validate URL pattern
  const validPatterns = [
    /^https:\/\/chat\.openai\.com\/share\//,
    /^https:\/\/chatgpt\.com\/share\//,
    /^https:\/\/claude\.ai\/share\//,
  ];
  if (!validPatterns.some((p) => p.test(trimmed))) {
    return { error: "Please paste a valid ChatGPT or Claude share link (https://chatgpt.com/share/... or https://claude.ai/share/...)" };
  }

  try {
    const res = await fetch(`${CORS_PROXY}${trimmed}`);
    if (!res.ok) return { error: `Failed to fetch link (${res.status}). Try pasting the conversation text manually instead.` };

    const html = await res.text();

    // ChatGPT: extract from __NEXT_DATA__ JSON
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      try {
        const data = JSON.parse(nextDataMatch[1]);
        const messages = extractChatGPTMessages(data);
        if (messages) return { text: messages };
      } catch { /* JSON parse failed, try raw extraction */ }
    }

    // Unescape the HTML (content lives in escaped JSON strings inside script tags)
    const fullText = cleanChatGPTText(html);

    // Strategy A: Find ### Day blocks with activities (richest content)
    const hashDayBlocks = [...fullText.matchAll(/###\s*Day\s+\d+[^\n]*\n(?:[-•*][^\n]*\n){1,10}/gi)];
    if (hashDayBlocks.length >= 3) {
      return { text: hashDayBlocks.map((m) => m[0].trim()).join("\n\n") };
    }

    // Strategy B: Find **Day N:** compact summary lines
    const boldDayLines = [...fullText.matchAll(/\*\*Day\s+\d+(?:\s*[-–—]\s*\d+)?\s*:\*\*\s*[^\n]{3,80}/gi)];
    if (boldDayLines.length >= 4) {
      return { text: boldDayLines.map((m) => m[0].replace(/\*\*/g, "").trim()).join("\n") };
    }

    // Strategy C: Find detailed day blocks (Day N → City with following lines)
    const dayBlockPattern = /(?:^|\n)\s*(?:#{1,3}\s*)?(?:\*{0,2})(?:📍\s*)?Day\s+\d+[^\n]*\n(?:[^\n]*\n){0,15}/gi;
    const blockMatches = [...fullText.matchAll(dayBlockPattern)];
    if (blockMatches.length >= 2) {
      return { text: blockMatches.map((m) => m[0].trim()).join("\n\n") };
    }

    // Strategy D: Just grab all Day lines
    const simpleMatches = [...fullText.matchAll(/Day\s+\d+[^\n]{0,500}/gi)];
    if (simpleMatches.length >= 2) {
      return { text: simpleMatches.map((m) => m[0].trim()).join("\n") };
    }

    // Last resort: strip HTML tags and extract visible text
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "\n")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (textContent.length > 100) return { text: textContent };

    return { error: "Could not extract conversation from the link. Try pasting the text manually." };
  } catch {
    return { error: "Network error fetching the link. Check your connection or paste the conversation text manually." };
  }
}

function extractChatGPTMessages(data: Record<string, unknown>): string | null {
  try {
    const props = data.props as Record<string, unknown>;
    const pageProps = props?.pageProps as Record<string, unknown>;

    // Try multiple known structures
    const serverResponse = pageProps?.serverResponse as Record<string, unknown>;
    const mapping = (serverResponse?.data as Record<string, unknown>)?.mapping as Record<string, unknown>
      ?? (pageProps as Record<string, unknown>)?.mapping;

    if (mapping && typeof mapping === "object") {
      const messages: string[] = [];
      for (const node of Object.values(mapping)) {
        const n = node as Record<string, unknown>;
        const msg = n?.message as Record<string, unknown>;
        if (!msg) continue;
        const author = (msg.author as Record<string, unknown>)?.role as string;
        const content = msg.content as Record<string, unknown>;
        const parts = content?.parts as string[];
        if (author && parts?.length) {
          const role = author === "user" ? "User" : "Assistant";
          messages.push(`${role}: ${parts.join("\n")}`);
        }
      }
      if (messages.length > 0) return messages.join("\n\n");
    }

    return null;
  } catch {
    return null;
  }
}
