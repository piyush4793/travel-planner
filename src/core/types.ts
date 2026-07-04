export type TravelStyle = "touch-and-go" | "explorer" | "immersive";
export type PlanStyle = "custom";
export type VisitedFilter = "all" | "visited" | "unvisited";

export type CityEntry = {
  name: string;
  lat: number;
  lng: number;
  bestMonths?: string[];
  notes?: string;
  /** Country-level experiences this city satisfies (authored or derived). */
  experiences?: string[];
};

export type CatalogEntry = {
  name: string;
  lat: number;
  lng: number;
  region: string;
};

/* ── LLM chat types ── */

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LLMProviderType = "openai" | "claude" | "gemini";

export type LLMKeys = Partial<Record<LLMProviderType, string>>;

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type LLMChatResult = {
  content: string;
  usage?: TokenUsage;
};

export type TripBrief = {
  originCountry: string;
  destinations: string[];
  travelers: number;
  durationDays: number;
  budget: "budget" | "mid-range" | "luxury";
  mandatoryCities: string[];
  preferences: string[];
  exclusions: string[];
};

/* ── Data types ── */

export type BudgetBreakdown = {
  solo: string;
  couple: string;
  family4: string;
};

export type Country = {
  name: string;
  lat: number;
  lng: number;
  region?: string;
  popularityScore?: number;
  bestMonths: string[];
  worstMonths?: string[];
  budget: string;
  budgetBreakdown?: BudgetBreakdown;
  experiences: string[];
  avoid?: string[];
  combo?: string[];
  landmark?: string;
  travelStyle?: TravelStyle[];
  cities?: CityEntry[];
  stopoverNote?: string;
  links?: { label: string; url: string }[];
  notes?: string;
};

/** Get display string from budget (handles both string and breakdown) */
export function getBudgetDisplay(budget: string | BudgetBreakdown, travelers = 2): string {
  if (typeof budget === "string") return budget;
  if (travelers >= 4) return budget.family4;
  if (travelers >= 2) return budget.couple;
  return budget.solo;
}
