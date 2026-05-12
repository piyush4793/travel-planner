/**
 * Curated trip groups — every seed country assigned to exactly one trip.
 * Max 3 countries per trip. First country is the "main" destination.
 * Inspired by the "stack countries" concept for optimal travel combinations.
 */

export type Region = "Asia" | "Europe" | "Middle East" | "Africa" | "Americas" | "Oceania";

export type TripGroupDef = {
  main: string;
  addOns: string[];
  region: Region;
};

export const TRIP_GROUPS: TripGroupDef[] = [
  { main: "Vietnam", addOns: ["Cambodia", "Laos"], region: "Asia" },
  { main: "Thailand", addOns: ["Malaysia", "Singapore"], region: "Asia" },
  { main: "Japan", addOns: ["South Korea"], region: "Asia" },
  { main: "China", addOns: [], region: "Asia" },
  { main: "Indonesia", addOns: ["Philippines"], region: "Asia" },
  { main: "Nepal", addOns: ["Bhutan"], region: "Asia" },
  { main: "Maldives", addOns: [], region: "Asia" },
  { main: "Iceland", addOns: ["Greenland"], region: "Europe" },
  { main: "Norway", addOns: ["Denmark", "Scotland"], region: "Europe" },
  { main: "UK", addOns: ["Netherlands"], region: "Europe" },
  { main: "France", addOns: ["Spain"], region: "Europe" },
  { main: "Italy", addOns: ["Greece"], region: "Europe" },
  { main: "Germany", addOns: ["Austria", "Switzerland"], region: "Europe" },
  { main: "Czech Republic", addOns: ["Poland", "Hungary"], region: "Europe" },
  { main: "Romania", addOns: [], region: "Europe" },
  { main: "Turkey", addOns: ["Egypt", "Dubai"], region: "Middle East" },
  { main: "Georgia", addOns: ["Russia", "Belarus"], region: "Europe" },
  { main: "South Africa", addOns: [], region: "Africa" },
  { main: "Argentina", addOns: ["Antarctica"], region: "Americas" },
  { main: "Australia", addOns: ["New Zealand"], region: "Oceania" },
  { main: "Hawaii", addOns: [], region: "Oceania" },
];

export const ALL_REGIONS: Region[] = ["Asia", "Europe", "Middle East", "Africa", "Americas", "Oceania"];
