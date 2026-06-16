/**
 * Curated trip groups — every seed country assigned to exactly one trip.
 * addOns are derived at runtime from the country's `combo` field in
 * data/rules/*.json (single source of truth). Seed only defines main + region.
 *
 * User-edited groups (tp_trip_customs) store full TripGroupDef with addOns.
 */

export type Region = "Asia" | "Europe" | "Middle East" | "Africa" | "Americas" | "Oceania";

export type TripGroupDef = {
  main: string;
  addOns: string[];
  region: Region;
  isCustom?: boolean;
};

type TripGroupSeed = { main: string; region: Region };

const TRIP_GROUP_SEEDS: TripGroupSeed[] = [
  // Asia (30)
  { main: "Afghanistan", region: "Asia" },
  { main: "Bangladesh", region: "Asia" },
  { main: "Bhutan", region: "Asia" },
  { main: "Brunei", region: "Asia" },
  { main: "Cambodia", region: "Asia" },
  { main: "China", region: "Asia" },
  { main: "India", region: "Asia" },
  { main: "Indonesia", region: "Asia" },
  { main: "Japan", region: "Asia" },
  { main: "Kazakhstan", region: "Asia" },
  { main: "Kyrgyzstan", region: "Asia" },
  { main: "Laos", region: "Asia" },
  { main: "Malaysia", region: "Asia" },
  { main: "Maldives", region: "Asia" },
  { main: "Mongolia", region: "Asia" },
  { main: "Myanmar", region: "Asia" },
  { main: "Nepal", region: "Asia" },
  { main: "North Korea", region: "Asia" },
  { main: "Pakistan", region: "Asia" },
  { main: "Philippines", region: "Asia" },
  { main: "Singapore", region: "Asia" },
  { main: "South Korea", region: "Asia" },
  { main: "Sri Lanka", region: "Asia" },
  { main: "Taiwan", region: "Asia" },
  { main: "Tajikistan", region: "Asia" },
  { main: "Thailand", region: "Asia" },
  { main: "Timor-Leste", region: "Asia" },
  { main: "Turkmenistan", region: "Asia" },
  { main: "Uzbekistan", region: "Asia" },
  { main: "Vietnam", region: "Asia" },
  // Europe (50)
  { main: "Albania", region: "Europe" },
  { main: "Andorra", region: "Europe" },
  { main: "Armenia", region: "Europe" },
  { main: "Austria", region: "Europe" },
  { main: "Azerbaijan", region: "Europe" },
  { main: "Belarus", region: "Europe" },
  { main: "Belgium", region: "Europe" },
  { main: "Bosnia and Herzegovina", region: "Europe" },
  { main: "Bulgaria", region: "Europe" },
  { main: "Croatia", region: "Europe" },
  { main: "Cyprus", region: "Europe" },
  { main: "Czech Republic", region: "Europe" },
  { main: "Denmark", region: "Europe" },
  { main: "Estonia", region: "Europe" },
  { main: "Finland", region: "Europe" },
  { main: "France", region: "Europe" },
  { main: "Georgia", region: "Europe" },
  { main: "Germany", region: "Europe" },
  { main: "Greece", region: "Europe" },
  { main: "Greenland", region: "Europe" },
  { main: "Hungary", region: "Europe" },
  { main: "Iceland", region: "Europe" },
  { main: "Ireland", region: "Europe" },
  { main: "Italy", region: "Europe" },
  { main: "Kosovo", region: "Europe" },
  { main: "Latvia", region: "Europe" },
  { main: "Liechtenstein", region: "Europe" },
  { main: "Lithuania", region: "Europe" },
  { main: "Luxembourg", region: "Europe" },
  { main: "Malta", region: "Europe" },
  { main: "Moldova", region: "Europe" },
  { main: "Monaco", region: "Europe" },
  { main: "Montenegro", region: "Europe" },
  { main: "Netherlands", region: "Europe" },
  { main: "North Macedonia", region: "Europe" },
  { main: "Norway", region: "Europe" },
  { main: "Poland", region: "Europe" },
  { main: "Portugal", region: "Europe" },
  { main: "Romania", region: "Europe" },
  { main: "Russia", region: "Europe" },
  { main: "San Marino", region: "Europe" },
  { main: "Serbia", region: "Europe" },
  { main: "Slovakia", region: "Europe" },
  { main: "Slovenia", region: "Europe" },
  { main: "Spain", region: "Europe" },
  { main: "Sweden", region: "Europe" },
  { main: "Switzerland", region: "Europe" },
  { main: "UK", region: "Europe" },
  { main: "Ukraine", region: "Europe" },
  { main: "Vatican City", region: "Europe" },
  // Middle East (16)
  { main: "Bahrain", region: "Middle East" },
  { main: "Egypt", region: "Middle East" },
  { main: "Iran", region: "Middle East" },
  { main: "Iraq", region: "Middle East" },
  { main: "Israel", region: "Middle East" },
  { main: "Jordan", region: "Middle East" },
  { main: "Kuwait", region: "Middle East" },
  { main: "Lebanon", region: "Middle East" },
  { main: "Oman", region: "Middle East" },
  { main: "Palestine", region: "Middle East" },
  { main: "Qatar", region: "Middle East" },
  { main: "Saudi Arabia", region: "Middle East" },
  { main: "Syria", region: "Middle East" },
  { main: "Turkey", region: "Middle East" },
  { main: "United Arab Emirates", region: "Middle East" },
  { main: "Yemen", region: "Middle East" },
  // Africa (52)
  { main: "Algeria", region: "Africa" },
  { main: "Angola", region: "Africa" },
  { main: "Benin", region: "Africa" },
  { main: "Botswana", region: "Africa" },
  { main: "Burkina Faso", region: "Africa" },
  { main: "Cameroon", region: "Africa" },
  { main: "Cape Verde", region: "Africa" },
  { main: "Central African Republic", region: "Africa" },
  { main: "Chad", region: "Africa" },
  { main: "Comoros", region: "Africa" },
  { main: "Democratic Republic of the Congo", region: "Africa" },
  { main: "Djibouti", region: "Africa" },
  { main: "Equatorial Guinea", region: "Africa" },
  { main: "Eritrea", region: "Africa" },
  { main: "Eswatini", region: "Africa" },
  { main: "Ethiopia", region: "Africa" },
  { main: "Gabon", region: "Africa" },
  { main: "Gambia", region: "Africa" },
  { main: "Ghana", region: "Africa" },
  { main: "Guinea", region: "Africa" },
  { main: "Guinea-Bissau", region: "Africa" },
  { main: "Ivory Coast", region: "Africa" },
  { main: "Kenya", region: "Africa" },
  { main: "Lesotho", region: "Africa" },
  { main: "Liberia", region: "Africa" },
  { main: "Libya", region: "Africa" },
  { main: "Madagascar", region: "Africa" },
  { main: "Malawi", region: "Africa" },
  { main: "Mali", region: "Africa" },
  { main: "Mauritania", region: "Africa" },
  { main: "Mauritius", region: "Africa" },
  { main: "Morocco", region: "Africa" },
  { main: "Mozambique", region: "Africa" },
  { main: "Namibia", region: "Africa" },
  { main: "Niger", region: "Africa" },
  { main: "Nigeria", region: "Africa" },
  { main: "Republic of the Congo", region: "Africa" },
  { main: "Rwanda", region: "Africa" },
  { main: "Senegal", region: "Africa" },
  { main: "Seychelles", region: "Africa" },
  { main: "Sierra Leone", region: "Africa" },
  { main: "Somalia", region: "Africa" },
  { main: "South Africa", region: "Africa" },
  { main: "South Sudan", region: "Africa" },
  { main: "Sudan", region: "Africa" },
  { main: "São Tomé and Príncipe", region: "Africa" },
  { main: "Tanzania", region: "Africa" },
  { main: "Togo", region: "Africa" },
  { main: "Tunisia", region: "Africa" },
  { main: "Uganda", region: "Africa" },
  { main: "Zambia", region: "Africa" },
  { main: "Zimbabwe", region: "Africa" },
  // Americas (35)
  { main: "Antigua and Barbuda", region: "Americas" },
  { main: "Argentina", region: "Americas" },
  { main: "Bahamas", region: "Americas" },
  { main: "Barbados", region: "Americas" },
  { main: "Belize", region: "Americas" },
  { main: "Bolivia", region: "Americas" },
  { main: "Brazil", region: "Americas" },
  { main: "Canada", region: "Americas" },
  { main: "Chile", region: "Americas" },
  { main: "Colombia", region: "Americas" },
  { main: "Costa Rica", region: "Americas" },
  { main: "Cuba", region: "Americas" },
  { main: "Dominica", region: "Americas" },
  { main: "Dominican Republic", region: "Americas" },
  { main: "Ecuador", region: "Americas" },
  { main: "El Salvador", region: "Americas" },
  { main: "Grenada", region: "Americas" },
  { main: "Guatemala", region: "Americas" },
  { main: "Guyana", region: "Americas" },
  { main: "Haiti", region: "Americas" },
  { main: "Honduras", region: "Americas" },
  { main: "Jamaica", region: "Americas" },
  { main: "Mexico", region: "Americas" },
  { main: "Nicaragua", region: "Americas" },
  { main: "Panama", region: "Americas" },
  { main: "Paraguay", region: "Americas" },
  { main: "Peru", region: "Americas" },
  { main: "Saint Kitts and Nevis", region: "Americas" },
  { main: "Saint Lucia", region: "Americas" },
  { main: "Saint Vincent and the Grenadines", region: "Americas" },
  { main: "Suriname", region: "Americas" },
  { main: "Trinidad and Tobago", region: "Americas" },
  { main: "United States", region: "Americas" },
  { main: "Uruguay", region: "Americas" },
  { main: "Venezuela", region: "Americas" },
  // Oceania (14)
  { main: "Australia", region: "Oceania" },
  { main: "Fiji", region: "Oceania" },
  { main: "Kiribati", region: "Oceania" },
  { main: "Marshall Islands", region: "Oceania" },
  { main: "Micronesia", region: "Oceania" },
  { main: "Nauru", region: "Oceania" },
  { main: "New Zealand", region: "Oceania" },
  { main: "Palau", region: "Oceania" },
  { main: "Papua New Guinea", region: "Oceania" },
  { main: "Samoa", region: "Oceania" },
  { main: "Solomon Islands", region: "Oceania" },
  { main: "Tonga", region: "Oceania" },
  { main: "Tuvalu", region: "Oceania" },
  { main: "Vanuatu", region: "Oceania" },
];

/** Resolve seed → TripGroupDef by deriving addOns from combo data */
function resolveSeed(seed: TripGroupSeed, comboMap: Map<string, string[]>, myListNames: Set<string>): TripGroupDef {
  const combo = comboMap.get(seed.main) ?? [];
  // Pick first 2 combo countries that are in the user's My List
  const addOns = combo.filter((c) => myListNames.has(c)).slice(0, 2);
  return { main: seed.main, addOns, region: seed.region };
}

export const ALL_REGIONS: Region[] = ["Asia", "Europe", "Middle East", "Africa", "Americas", "Oceania"];

/** Merge seed trip groups with user overrides + tombstones */
export function buildMergedTripGroups(
  customs: TripGroupDef[],
  deleted: string[],
  allCountryNames: string[],
  comboMap: Map<string, string[]>,
): TripGroupDef[] {
  const deletedSet = new Set(deleted);
  const customByMain = new Map(customs.map((g) => [g.main, g]));
  const nameSet = new Set(allCountryNames);

  const merged: TripGroupDef[] = [];
  for (const seed of TRIP_GROUP_SEEDS) {
    if (deletedSet.has(seed.main)) continue;
    const custom = customByMain.get(seed.main);
    const group = custom ?? resolveSeed(seed, comboMap, nameSet);
    customByMain.delete(seed.main);
    merged.push(sanitizeGroup(group, nameSet, !!custom));
  }

  // User-created groups (main not in seed)
  for (const custom of customByMain.values()) {
    if (deletedSet.has(custom.main)) continue;
    merged.push(sanitizeGroup(custom, nameSet, true));
  }

  return merged;
}

function sanitizeGroup(g: TripGroupDef, validNames: Set<string>, isCustom = false): TripGroupDef {
  const addOns = g.addOns
    .filter((n) => validNames.has(n) && n !== g.main)
    .filter((n, i, arr) => arr.indexOf(n) === i)
    .slice(0, 2);
  const region = ALL_REGIONS.includes(g.region) ? g.region : "Asia";
  return { main: g.main, addOns, region, ...(isCustom ? { isCustom: true } : {}) };
}
