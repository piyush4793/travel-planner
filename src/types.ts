export type TravelStyle = "touch-and-go" | "explorer" | "month-long";
export type PlanStyle = TravelStyle | "custom";
export type VisitedFilter = "all" | "visited" | "unvisited";

export type CityEntry = {
  name: string;
  lat: number;
  lng: number;
  bestMonths?: string[];
  notes?: string;
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

export type LLMProviderType = "openai";

export type LLMKeys = Partial<Record<LLMProviderType, string>>;

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

export type Country = {
  name: string;
  lat: number;
  lng: number;
  bestMonths: string[];
  worstMonths?: string[];
  budget: string;
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
