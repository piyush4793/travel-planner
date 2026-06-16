/**
 * Shared country-name → flag-emoji resolver.
 *
 * Uses a direct name→ISO-3166-1-alpha-2 map for all 197 catalog countries
 * plus common aliases (UK, USA, UAE, etc.) and rule-only destinations.
 * Falls back to Intl.DisplayNames reverse-lookup, then to a globe emoji.
 */

/* ── ISO code → flag emoji ─────────────────────────────────────────── */

function toFlagEmoji(code: string): string {
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    0x1f1a5 + upper.charCodeAt(0),
    0x1f1a5 + upper.charCodeAt(1),
  );
}

/* ── Country name → ISO 3166-1 alpha-2 code ────────────────────────── */

const NAME_TO_CODE: Record<string, string> = {
  // ── Asia ──
  Afghanistan: "AF", Armenia: "AM", Azerbaijan: "AZ", Bahrain: "BH",
  Bangladesh: "BD", Bhutan: "BT", Brunei: "BN", Cambodia: "KH",
  China: "CN", Georgia: "GE", India: "IN", Indonesia: "ID",
  Iran: "IR", Iraq: "IQ", Israel: "IL", Japan: "JP",
  Jordan: "JO", Kazakhstan: "KZ", Kuwait: "KW", Kyrgyzstan: "KG",
  Laos: "LA", Lebanon: "LB", Malaysia: "MY", Maldives: "MV",
  Mongolia: "MN", Myanmar: "MM", Nepal: "NP", "North Korea": "KP",
  Oman: "OM", Pakistan: "PK", Palestine: "PS", Philippines: "PH",
  Qatar: "QA", "Saudi Arabia": "SA", Singapore: "SG", "South Korea": "KR",
  "Sri Lanka": "LK", Syria: "SY", Taiwan: "TW", Tajikistan: "TJ",
  Thailand: "TH", "Timor-Leste": "TL", Turkey: "TR", Turkmenistan: "TM",
  "United Arab Emirates": "AE", Uzbekistan: "UZ", Vietnam: "VN", Yemen: "YE",

  // ── Europe ──
  Albania: "AL", Andorra: "AD", Austria: "AT", Belarus: "BY",
  Belgium: "BE", "Bosnia and Herzegovina": "BA", Bulgaria: "BG",
  Croatia: "HR", Cyprus: "CY", "Czech Republic": "CZ", Denmark: "DK",
  Estonia: "EE", Finland: "FI", France: "FR", Germany: "DE",
  Greece: "GR", Hungary: "HU", Iceland: "IS", Ireland: "IE",
  Italy: "IT", Kosovo: "XK", Latvia: "LV", Liechtenstein: "LI",
  Lithuania: "LT", Luxembourg: "LU", Malta: "MT", Moldova: "MD",
  Monaco: "MC", Montenegro: "ME", Netherlands: "NL", "North Macedonia": "MK",
  Norway: "NO", Poland: "PL", Portugal: "PT", Romania: "RO",
  Russia: "RU", "San Marino": "SM", Serbia: "RS", Slovakia: "SK",
  Slovenia: "SI", Spain: "ES", Sweden: "SE", Switzerland: "CH",
  UK: "GB", Ukraine: "UA", "Vatican City": "VA",

  // ── Africa ──
  Algeria: "DZ", Angola: "AO", Benin: "BJ", Botswana: "BW",
  "Burkina Faso": "BF", Cameroon: "CM", "Cape Verde": "CV",
  "Central African Republic": "CF", Chad: "TD", Comoros: "KM",
  "Democratic Republic of the Congo": "CD", Djibouti: "DJ", Egypt: "EG",
  "Equatorial Guinea": "GQ", Eritrea: "ER", Eswatini: "SZ",
  Ethiopia: "ET", Gabon: "GA", Gambia: "GM", Ghana: "GH",
  Guinea: "GN", "Guinea-Bissau": "GW", "Ivory Coast": "CI",
  Kenya: "KE", Lesotho: "LS", Liberia: "LR", Libya: "LY",
  Madagascar: "MG", Malawi: "MW", Mali: "ML", Mauritania: "MR",
  Mauritius: "MU", Morocco: "MA", Mozambique: "MZ", Namibia: "NA",
  Niger: "NE", Nigeria: "NG", "Republic of the Congo": "CG",
  Rwanda: "RW", "São Tomé and Príncipe": "ST", Senegal: "SN",
  Seychelles: "SC", "Sierra Leone": "SL", Somalia: "SO",
  "South Africa": "ZA", "South Sudan": "SS", Sudan: "SD",
  Tanzania: "TZ", Togo: "TG", Tunisia: "TN", Uganda: "UG",
  Zambia: "ZM", Zimbabwe: "ZW",

  // ── Americas ──
  "Antigua and Barbuda": "AG", Argentina: "AR", Bahamas: "BS",
  Barbados: "BB", Belize: "BZ", Bolivia: "BO", Brazil: "BR",
  Canada: "CA", Chile: "CL", Colombia: "CO", "Costa Rica": "CR",
  Cuba: "CU", Dominica: "DM", "Dominican Republic": "DO",
  Ecuador: "EC", "El Salvador": "SV", Grenada: "GD", Guatemala: "GT",
  Guyana: "GY", Haiti: "HT", Honduras: "HN", Jamaica: "JM",
  Mexico: "MX", Nicaragua: "NI", Panama: "PA", Paraguay: "PY",
  Peru: "PE", "Saint Kitts and Nevis": "KN", "Saint Lucia": "LC",
  "Saint Vincent and the Grenadines": "VC", Suriname: "SR",
  "Trinidad and Tobago": "TT", "United States": "US", Uruguay: "UY",
  Venezuela: "VE",

  // ── Oceania ──
  Australia: "AU", Fiji: "FJ", Kiribati: "KI", "Marshall Islands": "MH",
  Micronesia: "FM", Nauru: "NR", "New Zealand": "NZ", Palau: "PW",
  "Papua New Guinea": "PG", Samoa: "WS", "Solomon Islands": "SB",
  Tonga: "TO", Tuvalu: "TV", Vanuatu: "VU",

  // ── Non-catalog / rule-only destinations ──
  Greenland: "GL", Scotland: "GB-SCT", Hawaii: "US",
};

/* ── Common aliases ────────────────────────────────────────────────── */

const ALIASES: Record<string, string> = {
  "United Kingdom": "UK",
  USA: "United States",
  UAE: "United Arab Emirates",
  Czechia: "Czech Republic",
  "Côte d'Ivoire": "Ivory Coast",
  Burma: "Myanmar",
  Swaziland: "Eswatini",
  "East Timor": "Timor-Leste",
  "Cabo Verde": "Cape Verde",
  Dubai: "United Arab Emirates",
};

/* ── Special emoji overrides (non-standard flags) ──────────────────── */

const SPECIAL_EMOJI: Record<string, string> = {
  Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  Antarctica: "🇦🇶",
  Hawaii: "🌺",
  Kosovo: "🇽🇰",
};

/* ── Intl fallback cache (built once) ──────────────────────────────── */

let intlCache: Map<string, string> | null = null;

function getIntlCache(): Map<string, string> {
  if (intlCache) return intlCache;
  intlCache = new Map();
  if (typeof Intl === "undefined" || typeof Intl.DisplayNames === "undefined") {
    return intlCache;
  }
  try {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    for (let first = 65; first <= 90; first++) {
      for (let second = 65; second <= 90; second++) {
        const code = String.fromCharCode(first, second);
        try {
          const displayName = displayNames.of(code);
          if (displayName && displayName !== code) {
            intlCache.set(displayName.toLowerCase(), toFlagEmoji(code));
          }
        } catch { /* skip invalid codes */ }
      }
    }
  } catch { /* Intl unavailable */ }
  return intlCache;
}

/* ── Public API ────────────────────────────────────────────────────── */

export function getCountryFlag(name: string): string {
  const trimmed = name.trim();

  // 1. Special emoji overrides
  if (SPECIAL_EMOJI[trimmed]) return SPECIAL_EMOJI[trimmed];

  // 2. Direct match in NAME_TO_CODE
  const code = NAME_TO_CODE[trimmed];
  if (code) return toFlagEmoji(code);

  // 3. Alias resolution
  const aliasTarget = ALIASES[trimmed];
  if (aliasTarget) {
    if (SPECIAL_EMOJI[aliasTarget]) return SPECIAL_EMOJI[aliasTarget];
    const aliasCode = NAME_TO_CODE[aliasTarget];
    if (aliasCode) return toFlagEmoji(aliasCode);
  }

  // 4. Case-insensitive Intl.DisplayNames fallback
  const intl = getIntlCache();
  const intlResult = intl.get(trimmed.toLowerCase());
  if (intlResult) return intlResult;

  // 5. Globe fallback
  return "🌍";
}
