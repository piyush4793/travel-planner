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
