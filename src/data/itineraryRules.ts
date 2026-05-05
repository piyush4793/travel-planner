export type RuleActivity = {
  name: string;
  cost?: string;
  tip?: string;
};

export type RuleDayPlan = {
  theme: string;
  activities: RuleActivity[];
  hotels?: { name: string; budget: string }[];
  meals?: string[];
};

export type CityRule = {
  name: string;
  minDays: number;
  recDays: number;
  maxDays: number;
  note?: string;
  days: RuleDayPlan[];
};

export type CountryRule = {
  sim?: string;
  apps?: string[];
  cityOrder: string[];
  cities: Record<string, CityRule>;
  styleDefaults: Record<string, string[]>;
  connections: { from: string; to: string; method: string; cost?: string }[];
  extras?: string[];
  cityImages?: Record<string, string[]>;
};

export const ITINERARY_RULES: Record<string, CountryRule> = {
  Vietnam: {
    sim: "Viettel",
    apps: ["Grab (cabs)", "Klook (tickets)", "Happy Cow (veg food)", "12go.asia (trains)"],
    cityOrder: ["Ho Chi Minh City", "Da Nang", "Hoi An", "Hanoi", "Ninh Binh", "Ha Long Bay", "Sapa"],
    styleDefaults: {
      "touch-and-go": ["Ho Chi Minh City", "Da Nang"],
      "explorer":     ["Ho Chi Minh City", "Da Nang", "Hanoi", "Ninh Binh", "Ha Long Bay"],
      "month-long":   ["Ho Chi Minh City", "Da Nang", "Hoi An", "Hanoi", "Ninh Binh", "Ha Long Bay", "Sapa"],
      "custom":       ["Ho Chi Minh City", "Da Nang", "Hanoi"],
    },
    cities: {
      "Ho Chi Minh City": {
        name: "Ho Chi Minh City",
        minDays: 2,
        recDays: 2,
        maxDays: 3,
        note: "Add +1 day if you need rest after a long flight",
        days: [
          {
            theme: "History & City Life",
            activities: [
              { name: "War Remnants Museum", cost: "₹136 (4k VND)" },
              { name: "Independence Palace", cost: "~₹200" },
              { name: "Central Post Office — free entry, French colonial gem" },
              { name: "Ben Thanh Market — evening street food & souvenirs" },
              { name: "Bui Vien Street — nightlife & live music" },
            ],
            meals: ["Shambhalla", "Namaste India", "Saigon International"],
            hotels: [
              { name: "Vân Anh Luxury (Hong Vina)", budget: "under ₹2,500/night" },
              { name: "Cicilia Saigon Hotels & Spa", budget: "under ₹4,000/night" },
            ],
          },
          {
            theme: "Cu Chi & Mekong Excursions",
            activities: [
              { name: "Cu Chi Tunnel + Mekong Delta tour", cost: "₹4–4.5k pp (combined)", tip: "Book via Viator or Klook" },
              { name: "Cu Chi Tunnel only (shorter option)", cost: "₹1.5–2k pp" },
              { name: "Mekong boat ride & local village stops" },
              { name: "Air Saigon rooftop bar — city views at sunset" },
            ],
            hotels: [
              { name: "Vân Anh Luxury (Hong Vina)", budget: "under ₹2,500/night" },
            ],
          },
          {
            theme: "Rest & Hidden Gems",
            activities: [
              { name: "District 1 cafés & leisurely brunch" },
              { name: "Saigon Zoo and Botanical Gardens" },
              { name: "Nguyen Hue Walking Street" },
            ],
          },
        ],
      },

      "Da Nang": {
        name: "Da Nang",
        minDays: 2,
        recDays: 3,
        maxDays: 4,
        days: [
          {
            theme: "Beach & Dragon Bridge",
            activities: [
              { name: "My Khe Beach — morning swim & fresh coconut" },
              { name: "Dragon Bridge fire & water show", tip: "Sat & Sun only at 9 PM" },
              { name: "Marble Mountain + Hoa Nghiem Cave" },
              { name: "Han Market seafood dinner" },
            ],
            hotels: [
              { name: "Grand Gold Hotel", budget: "under ₹3,000/night" },
              { name: "Sandy Beach Non Nuoc Resort", budget: "under ₹3,500/night" },
              { name: "Haian Beach Hotel", budget: "under ₹4,000/night" },
            ],
          },
          {
            theme: "Bana Hills Full Day",
            activities: [
              { name: "Bana Hills — Golden Bridge & French Village", cost: "₹3.5k pp entry" },
              { name: "Cable car — one of the longest in the world" },
              { name: "Fantasy Park roller coaster" },
              { name: "Round-trip transfer from Da Nang", cost: "~₹500 pp" },
            ],
            hotels: [
              { name: "Grand Sunrise Boutique Hotel", budget: "under ₹3,000/night" },
              { name: "Halina Hotel and Apartments", budget: "under ₹3,500/night" },
            ],
          },
          {
            theme: "Hoi An Ancient Town",
            activities: [
              { name: "Hoi An Old Town & lantern-lit streets", tip: "45 min cab from Da Nang, ~₹800 pp" },
              { name: "Japanese Covered Bridge & Thu Bon riverside" },
              { name: "Son Tra Peninsula & Lady Buddha Statue" },
              { name: "Lantern boat on Thu Bon River (evening)" },
            ],
          },
          {
            theme: "My Son Sanctuary",
            activities: [
              { name: "My Son Sanctuary — ancient Cham ruins", cost: "~₹500 entry" },
              { name: "Marble Mountain (if not done Day 1)" },
              { name: "Final Da Nang seafood feast" },
            ],
          },
        ],
      },

      "Hoi An": {
        name: "Hoi An",
        minDays: 1,
        recDays: 2,
        maxDays: 2,
        days: [
          {
            theme: "Ancient Town & Lanterns",
            activities: [
              { name: "Hoi An Old Town UNESCO Heritage streets" },
              { name: "Japanese Covered Bridge & Tan Ky Ancient House" },
              { name: "Lantern boat ride on Thu Bon River (evening)" },
              { name: "Night market & bánh mì for dinner" },
            ],
            hotels: [
              { name: "Hoi An Historic Hotel", budget: "under ₹3,000/night" },
            ],
          },
          {
            theme: "Tailor, Beach & Temples",
            activities: [
              { name: "An Bang Beach — cycling distance from Old Town" },
              { name: "Custom tailor shop — get clothes made overnight" },
              { name: "My Son Sanctuary (45 min)", cost: "~₹500 entry" },
              { name: "Cooking class with local market visit" },
            ],
          },
        ],
      },

      "Hanoi": {
        name: "Hanoi",
        minDays: 1,
        recDays: 1,
        maxDays: 2,
        note: "Base for Ninh Binh & Ha Long Bay day trips",
        days: [
          {
            theme: "Old Quarter & Lakes",
            activities: [
              { name: "Hoan Kiem Lake & Ngoc Son Temple" },
              { name: "Old Quarter — 36 ancient trade streets walk" },
              { name: "St Joseph's Cathedral" },
              { name: "Train Street" },
              { name: "Thang Long Water Puppet Theater (evening)" },
            ],
            meals: ["Bun Cha Huong Lien (Obama's visit spot!)", "Banh Mi 25"],
            hotels: [
              { name: "Hanoi Anise Hotel and Spa", budget: "under ₹2,500/night" },
              { name: "Diamond Legend Hotel", budget: "under ₹3,200/night" },
              { name: "Vision Premier Hotel and Spa", budget: "under ₹3,500/night" },
            ],
          },
          {
            theme: "Temples & Museums",
            activities: [
              { name: "Ho Chi Minh Mausoleum & Museum" },
              { name: "Temple of Literature" },
              { name: "Vietnam Museum of Ethnology" },
              { name: "West Lake (Hồ Tây) promenade & local cafés" },
            ],
          },
        ],
      },

      "Ninh Binh": {
        name: "Ninh Binh",
        minDays: 1,
        recDays: 1,
        maxDays: 1,
        note: "Day trip from Hanoi (1–1.5 hr). Leave luggage at Hanoi bus station locker.",
        days: [
          {
            theme: "Caves, Boats & Karst Peaks",
            activities: [
              { name: "Mua Cave viewpoint — 500-step climb, panoramic vista", cost: "~₹400 pp" },
              { name: "Trang An Boating — Route 3 through cave system", cost: "~₹1,000 pp", tip: "3–4 hrs, most scenic route" },
              { name: "Bich Dong Pagoda (free)" },
              { name: "Return to Hanoi by evening bus" },
            ],
          },
        ],
      },

      "Ha Long Bay": {
        name: "Ha Long Bay",
        minDays: 1,
        recDays: 1,
        maxDays: 1,
        note: "Day trip from Hanoi. Shuttle bus or public bus (~3–4 hrs each way).",
        days: [
          {
            theme: "Cruise the Emerald Waters",
            activities: [
              { name: "Sung Sot (Surprise) Cave — largest in Ha Long" },
              { name: "Kayaking through limestone karsts" },
              { name: "Bamboo or Coconut boat ride" },
              { name: "Beach stop & swimming" },
            ],
            hotels: [
              { name: "La Regina Royal Cruise", budget: "₹19,261 pp" },
              { name: "Santa Maria Cruise Halong", budget: "₹20,794 pp" },
              { name: "Doris Cruise", budget: "₹23,885 pp" },
            ],
          },
        ],
      },

      "Sapa": {
        name: "Sapa",
        minDays: 2,
        recDays: 2,
        maxDays: 3,
        note: "Overnight train from Hanoi (~8 hrs, ₹2,500 pp via 12go.asia)",
        days: [
          {
            theme: "Peaks & Village Culture",
            activities: [
              { name: "Fansipan cable car — Indochina's highest peak", cost: "₹3,000 pp", tip: "30 min wait monorail, 60 min cable car — book early" },
              { name: "Swing Sapa", cost: "₹300 pp" },
              { name: "Cat Cat Village walk" },
              { name: "Sapa Museum" },
            ],
            hotels: [
              { name: "Sapa Village Hotel", budget: "under ₹3,000/night" },
              { name: "Sapa Center Hotel", budget: "under ₹3,500/night" },
            ],
          },
          {
            theme: "Rice Terraces & Nature",
            activities: [
              { name: "Muong Hoa Valley — terraced rice fields & H'mong villages" },
              { name: "Hoang Lien National Park trek" },
              { name: "Silver Waterfall & Love Waterfall" },
              { name: "Notre Dame Cathedral (Sapa Church)" },
            ],
          },
          {
            theme: "Off the Beaten Path",
            activities: [
              { name: "Village homestay with local family" },
              { name: "Ta Phin Village — Red Dao embroidery" },
              { name: "Y Linh Ho & Lao Chai minority villages" },
            ],
          },
        ],
      },
    },

    connections: [
      { from: "Ho Chi Minh City", to: "Da Nang",    method: "Flight (morning)",         cost: "₹6,000 pp incl. baggage" },
      { from: "Da Nang",          to: "Hanoi",       method: "Flight (morning)",         cost: "₹6,000 pp" },
      { from: "Hanoi",            to: "Ninh Binh",   method: "Bus or hired cab",         cost: "~₹200 pp (1–1.5 hr)" },
      { from: "Hanoi",            to: "Ha Long Bay", method: "Shuttle bus (~3–4 hrs)",   cost: "under ₹1,500 pp" },
      { from: "Hanoi",            to: "Sapa",        method: "Overnight train (8 hrs)",  cost: "₹2,500 pp via 12go.asia" },
      { from: "Sapa",             to: "Hanoi",       method: "Overnight train (return)", cost: "₹2,500 pp" },
    ],

    extras: ["Phu Quoc Island", "Da Lat", "Nha Trang", "Cat Ba Island", "Ha Giang Loop", "Phong Nha Cave"],

    cityImages: {
      "Ho Chi Minh City": ["Ho Chi Minh City skyline Vietnam", "Ben Thanh Market Saigon", "Mekong Delta Vietnam boat"],
      "Da Nang":          ["Da Nang beach Vietnam coastline", "Dragon Bridge Da Nang Vietnam", "Marble Mountains Da Nang"],
      "Hoi An":           ["Hoi An Ancient Town lantern night", "Hoi An yellow buildings riverside", "Hoi An old quarter Vietnam"],
      "Hanoi":            ["Hoan Kiem Lake Hanoi", "Hanoi Old Quarter street Vietnam", "Temple of Literature Hanoi Vietnam"],
      "Ninh Binh":        ["Trang An Ninh Binh boat Vietnam", "Ninh Binh rice paddy karst", "Tam Coc Ninh Binh Vietnam"],
      "Ha Long Bay":      ["Ha Long Bay limestone karst Vietnam", "Halong Bay sunrise boat", "Ha Long Bay emerald water"],
      "Sapa":             ["Sapa rice terraces Vietnam mountain", "Fansipan peak Sapa Vietnam", "Muong Hoa Valley Sapa"],
    },
  },

  Norway: {
    sim: "Telenor or Telia — buy at Oslo Airport (Gardermoen)",
    apps: ["Entur (book all buses & trains)", "Yr (Norway weather — far more accurate than Google)", "Vy (train tickets)", "FRAM (Møre og Romsdal buses)", "Aurora Alerts + Hello Aurora (KP index for Northern Lights)"],
    cityOrder: ["Oslo", "Bergen", "Flam", "Voss", "Alesund", "Geirangerfjord", "Tromso"],
    styleDefaults: {
      "touch-and-go": ["Oslo", "Bergen", "Flam"],
      "explorer":     ["Oslo", "Bergen", "Flam", "Alesund", "Tromso"],
      "month-long":   ["Oslo", "Bergen", "Flam", "Voss", "Alesund", "Geirangerfjord", "Tromso"],
      "custom":       ["Oslo", "Bergen", "Tromso"],
    },
    cities: {
      "Oslo": {
        name: "Oslo",
        minDays: 2,
        recDays: 2,
        maxDays: 3,
        days: [
          {
            theme: "City Icons & Viking Heritage",
            activities: [
              { name: "Vigeland Sculpture Park — 212 bronze & granite works across 80 acres, free all day" },
              { name: "Akershus Fortress — free grounds, medieval ramparts, Oslo harbour panorama" },
              { name: "Oslo Opera House — free rooftop walk on the marble-clad sloping roof" },
              { name: "Aker Brygge waterfront — fresh shrimp sandwich, harbour atmosphere, evening bars" },
              { name: "Karl Johans Gate — pedestrian street from Central Station to Royal Palace" },
            ],
            hotels: [
              { name: "Thon Hotel Opera (central, near station)", budget: "₹18,000–26,000/night" },
              { name: "Comfort Hotel Grand Central", budget: "₹14,000–20,000/night" },
            ],
          },
          {
            theme: "Bygdøy Peninsula & World-Class Art",
            activities: [
              { name: "National Museum — Munch's The Scream original + Norway's largest art collection", cost: "₹2,000 pp" },
              { name: "Ferry Aker Brygge → Bygdøy (10 min, seasonal)", cost: "₹310 pp" },
              { name: "Viking Age Museum (Bygdøy) — 1,200-yr-old Oseberg & Gokstad ships", cost: "₹2,000 pp" },
              { name: "Fram Museum — polar ship that reached both poles, walk inside the hull", cost: "₹1,900 pp" },
              { name: "Holmenkollen ski jump viewpoint + Ski Museum (T-bane line 1)", cost: "₹500 metro + ₹1,200 museum" },
            ],
          },
          {
            theme: "Fjord, Art & Neighbourhoods",
            activities: [
              { name: "Oslofjord sightseeing cruise (2 hrs, summer)", cost: "₹2,000 pp" },
              { name: "Sørenga sea pool — outdoor fjord swimming on floating pontoon, free (summer)" },
              { name: "Munch Museum — 28,000 works, Deichman Library rooftop views", cost: "₹1,500 pp" },
              { name: "Grünerløkka neighbourhood — vintage shops, murals, Oslo's best coffee" },
            ],
          },
        ],
      },

      "Bergen": {
        name: "Bergen",
        minDays: 1,
        recDays: 2,
        maxDays: 3,
        note: "Take the Bergen Line scenic train from Oslo (7 hrs) — one of Europe's great rail journeys; book at vy.no 90 days out for Mini Pris fares. Bergen is Europe's rainiest city — waterproofs are non-negotiable.",
        days: [
          {
            theme: "Bryggen UNESCO Wharf & Fløyen Summit",
            activities: [
              { name: "Bryggen Wharf — UNESCO medieval Hanseatic warehouses; explore the hidden back alleys before 10 AM (cruise ships arrive later)" },
              { name: "Hanseatic Museum in Bryggen — merchant life preserved since 1704", cost: "₹1,100 pp" },
              { name: "Bergen Fish Market (Fisketorget) — fresh shrimp sandwich or salmon cone, best lunch in Bergen", cost: "₹800–1,500" },
              { name: "Fløibanen funicular to Mt. Fløyen (320m) — 360° city, fjord & island views", cost: "₹2,300 pp RT" },
              { name: "Bergenhus Fortress & Håkon's Hall — free exterior, medieval harbour walk" },
            ],
            hotels: [
              { name: "Hotel Havnekontoret (Bryggen warehouse)", budget: "₹36,000–56,000/night" },
              { name: "Thon Hotel Rosenkrantz (near Bryggen)", budget: "₹18,000–26,000/night" },
              { name: "Citybox Bergen (budget)", budget: "₹8,000–12,000/night" },
            ],
          },
          {
            theme: "Hardangerfjord Day Trip & Grieg",
            activities: [
              { name: "Hardangerfjord or Mostraumen fjord cruise from Bergen (summer, full day)", cost: "₹8,000–12,000 pp", tip: "Book at rodnefjordcruise.no" },
              { name: "Troldhaugen — Edvard Grieg's lakeside villa, museum & summer concerts", cost: "₹1,200 pp", tip: "Check griegconcerts.no for live performances" },
              { name: "Ulriken cable car — Bergen's highest point (643m), optional hike across ridge to Fløyen (2 hrs)", cost: "₹1,500 pp RT" },
              { name: "KODE Art Museums — Munch, Picasso & world-class silver collection", cost: "₹1,200 pp" },
            ],
          },
          {
            theme: "Old Bergen & Deeper Exploration",
            activities: [
              { name: "Gamle Bergen Museum — open-air 18th-century neighbourhood of 55 wooden houses", cost: "₹600 pp" },
              { name: "Fantoft Stave Church — 900-yr-old stave church rebuilt after arson, 5-min drive south" },
              { name: "Vøringsfossen waterfall day trip to Eidfjord — one of Norway's tallest falls (182m), 3 hrs drive summer only", cost: "₹3,000 pp guided or hire car" },
            ],
          },
        ],
      },

      "Flam": {
        name: "Flam",
        minDays: 1,
        recDays: 2,
        maxDays: 2,
        note: "From Bergen: train to Voss (1 hr, vy.no) + bus to Flam (1.5 hrs). Arrive in the evening for Day 1 (Stegastein + village); Day 2 is the Railway + Nærøyfjord cruise. Book Flåmsbana at norwaysbest.com — summer dates sell out 2–3 months ahead.",
        days: [
          {
            theme: "Arrival Evening & Stegastein Viewpoint",
            activities: [
              { name: "Stegastein viewpoint — cantilevered platform 650m above Aurlandsfjord, 15-min drive from village. Free, open 24/7. Best at golden hour." },
              { name: "Undredal village (20-min drive) — Norway's smallest village (~100 people), smoked brown goat cheese tasting, free entry" },
              { name: "Ægir Bryggeri brewpub — Viking-longhouse design, local craft beers & hearty Norwegian food" },
              { name: "Flam waterfront walk along Aurlandsfjord at dusk" },
            ],
            hotels: [
              { name: "Fretheim Hotel (historic, fjordside)", budget: "₹36,000–56,000/night" },
              { name: "Flamsbrygga Hotel (waterfront)", budget: "₹22,000–36,000/night" },
            ],
          },
          {
            theme: "Flåmsbana Railway & Nærøyfjord Cruise",
            activities: [
              { name: "Flåm Railway (Flåmsbana) to Myrdal & return — world's steepest standard-gauge rail, 865m climb, Kjosfossen waterfall performance stop", cost: "₹8,800 pp RT", tip: "Book at norwaysbest.com. Sit left side heading up for best views. Summer fills 2+ months out." },
              { name: "Nærøyfjord UNESCO electric ferry Flam → Gudvangen (2 hrs) — world's narrowest fjord, sheer 1,700m cliffs, silent electric vessel", cost: "₹5,000–6,300 pp one-way", tip: "Book combined Rail + Fjord at norwaysbest.com. One-way cruise; Bus 950 continues from Gudvangen." },
              { name: "Bus 950 Gudvangen → Voss (1 hr, Skyss) — continue onward toward Alesund or stay in Voss", cost: "₹1,100 pp" },
              { name: "Aurlandsfjellet Snow Road — drive to Aurland viewpoint on Norway's highest mountain road (summer only, free)" },
            ],
          },
        ],
      },

      "Voss": {
        name: "Voss",
        minDays: 1,
        recDays: 2,
        maxDays: 2,
        note: "Transit hub between Bergen Line and Alesund. Don't skip Stalheim Gorge — one of Norway's most dramatic road descents (14 hairpins). Ski season Jan–Easter. Adventure centre summer: rafting, paragliding, skydiving.",
        days: [
          {
            theme: "Adventure Capital & Gondola",
            activities: [
              { name: "Voss Gondol cable car to 886m summit — fjord & mountain panorama (free to hike down)", cost: "₹1,500 pp RT" },
              { name: "Paragliding tandem from Hangur summit (summer)", cost: "₹8,000–14,000 pp" },
              { name: "White-water rafting on Vosso river (June–Sept)", cost: "₹4,000–6,000 pp (2–3 hrs)" },
              { name: "Voss ski resort — groomed runs + off-piste (Jan–March)", cost: "₹4,000–6,000 pp day pass" },
              { name: "Skydiving over Voss (Norway's skydive capital, June–Sept)", cost: "₹14,000–18,000 pp" },
            ],
            hotels: [
              { name: "Fleischer's Hotel (historic, fjordside, 1889)", budget: "₹14,000–22,000/night" },
              { name: "Park Hotel Vossevangen", budget: "₹10,000–16,000/night" },
            ],
          },
          {
            theme: "Stalheim Gorge & Nærøyfjord Viewpoints",
            activities: [
              { name: "Stalheim Hotel viewpoint & Stalheimskleiva — 13% gradient, 13 hairpin bends into the gorge (summer road only, check opening dates)" },
              { name: "Nærøydalen valley walk — glacier-carved valley below Stalheim, flat easy path, free" },
              { name: "Tvindefossen waterfall (26m drop, roadside, free) — 15-min north of Voss on E16" },
              { name: "Voss town church (Vangskyrkja) — 13th-century stone church, free" },
              { name: "Voss Museum of Folk Life" },
            ],
          },
        ],
      },

      "Alesund": {
        name: "Alesund",
        minDays: 1,
        recDays: 2,
        maxDays: 2,
        note: "Best May–Sept. Geirangerfjord roads (Eagle Road, Trollstigen, Dalsnibba) close Oct–May — confirm openings at vegvesen.no. Rent a car in Alesund for Day 2 self-drive loop; all major agencies at the airport.",
        days: [
          {
            theme: "Art Nouveau Town & Panoramic Views",
            activities: [
              { name: "Aksla Hill viewpoint — 418 steps, panoramic archipelago & city view (free, best at sunset)" },
              { name: "Art Nouveau Centre (Jugendstilsenteret) — why the city rebuilt in Jugendstil after the 1904 fire", cost: "₹1,000 pp" },
              { name: "Sunnmøre Museum — Viking ships & 55-building open-air museum on the water", cost: "₹800 pp" },
              { name: "Ålesund Fish Market & harbour walk — local fiskesuppe (fish soup) lunch" },
              { name: "Atlanterhavsparken aquarium — Atlantic sea life including wolf fish & seals", cost: "₹1,400 pp" },
            ],
            hotels: [
              { name: "Brosundet Hotel (warehouse-style, canal views)", budget: "₹10,000–16,000/night" },
              { name: "Quality Hotel Waterfront Alesund", budget: "₹7,000–10,000/night" },
            ],
          },
          {
            theme: "Eagle Road Self-Drive Loop to Geirangerfjord",
            activities: [
              { name: "Drive Eagle Road (Ørnesvingen) — 11 hairpin bends to viewpoint 620m above Geirangerfjord; best light before 10 AM" },
              { name: "Dalsnibba mountain plateau — drive Norway's highest public road to 1,476m (summer only, ₹100 toll)", cost: "Toll ₹100 pp" },
              { name: "Flydalsjuvet cliff viewpoint — classic postcard overhang shot over the fjord (free)" },
              { name: "Geiranger village — explore waterfront; Seven Sisters & Suitor waterfalls visible from shore" },
              { name: "Geiranger → Hellesylt ferry (45 min across the fjord, then drive back to Alesund 1.5 hrs)", cost: "₹450 pp", tip: "Much faster return than retracing Eagle Road. Ferry runs summer only." },
            ],
          },
        ],
      },

      "Geirangerfjord": {
        name: "Geirangerfjord",
        minDays: 1,
        recDays: 1,
        maxDays: 2,
        note: "Best May–Sept. All approach roads (Eagle Road, Trollstigen, Rv63) close Oct–May. Recommended as an overnight from Alesund for month-long trips. Cruise season peaks June–Aug; kayak season May–Sept.",
        days: [
          {
            theme: "UNESCO Fjord Cruise & Viewpoints",
            activities: [
              { name: "Geirangerfjord sightseeing cruise — Seven Sisters (82m) & Suitor waterfalls, Friaren (Pulpit)", cost: "₹1,800–3,600 pp (1–2 hr cruise)", tip: "Full 4-hr cruise to Hellesylt and back ₹7,500 pp — book at geirangerfjord.no" },
              { name: "Eagle Road (Ørnesvingen) — 11-hairpin viewpoint 620m above the fjord (car essential)" },
              { name: "Flydalsjuvet cliff viewpoint — classic postcard overhang (free, 5-min drive from village)" },
              { name: "Dalsnibba mountain plateau drive to 1,476m — highest public road in Norway (summer only, ₹100 toll)" },
              { name: "Geiranger village waterfront walk — charming 250-person village at fjord head" },
            ],
            hotels: [
              { name: "Hotel Union Geiranger (iconic clifftop, fjord view)", budget: "₹28,000–56,000/night" },
              { name: "Grande Fjord Hotel", budget: "₹14,000–22,000/night" },
            ],
          },
          {
            theme: "Kayaking the Fjord & Hidden Waterfalls",
            activities: [
              { name: "Guided fjord kayaking — paddle beneath Seven Sisters waterfall (3–4 hrs)", cost: "₹8,000–12,000 pp", tip: "Book with Geiranger Kayaks. Small groups, morning slots sunniest." },
              { name: "Hike to Skageflå mountain farm — abandoned farm 250m above water, viewpoint into the fjord (3 hrs RT)" },
              { name: "Westerås Farm viewpoint — lesser-known clifftop view of full fjord, short drive from village" },
              { name: "Return to Alesund via Trollstigen (2.5 hrs) — stop at Trollstigen visitor centre platform" },
            ],
          },
        ],
      },

      "Tromso": {
        name: "Tromso",
        minDays: 2,
        recDays: 3,
        maxDays: 4,
        note: "Best Sept–March for Northern Lights. Feb–March: daylight returns + snow stable — ideal combination. Polar night (no sun at all) Nov–Jan. Summer (June–Aug): Midnight Sun, whale watching closes, dog sledding unavailable.",
        days: [
          {
            theme: "Arctic City & Cathedral",
            activities: [
              { name: "Arctic Cathedral (Ishavskatedralen) — iconic triangular A-frame glass facade (free exterior; interior ₹800 pp)" },
              { name: "Fjellheisen cable car — 421m summit, panoramic fjord & city views year-round", cost: "₹1,800 pp RT" },
              { name: "Polaria Museum — interactive Arctic exhibits & bearded seal feeding shows", cost: "₹1,750 pp" },
              { name: "Tromsø Arctic-Alpine Botanical Garden — world's northernmost botanical garden, free (summer)" },
              { name: "Storgata street, Ølhallen pub (Norway's oldest) & cosy café with brunost (brown cheese)" },
            ],
            hotels: [
              { name: "Clarion Hotel The Edge (harbour views)", budget: "₹16,000–26,000/night" },
              { name: "Thon Hotel Polar", budget: "₹14,000–22,000/night" },
              { name: "Smarthotel Tromsø (budget)", budget: "₹8,000–12,000/night" },
            ],
          },
          {
            theme: "Northern Lights Hunt",
            activities: [
              { name: "Guided Northern Lights evening tour — minibus to dark fjord valleys 40–80 km away (4–5 hrs)", cost: "₹19,000–26,000 pp", tip: "Book with 2–3 operators (Pukka Travels, Lights Over Lapland, Northern Lights Tromso) — most offer free rebook night if no lights appear" },
              { name: "KP index 2+ is sufficient away from city lights; KP 3+ is excellent — check Hello Aurora app" },
              { name: "Self-drive option: rent a car, drive E8 or E6 toward Skibotn — no guide cost, full flexibility" },
              { name: "Camera settings: ISO 1600–3200, f/2.8, 8–20s shutter, manual focus infinity" },
            ],
          },
          {
            theme: "Arctic Wilderness Adventures",
            activities: [
              { name: "Dog sledding with Husky teams — 2–3 hrs in Arctic wilderness (Nov–March)", cost: "₹32,000–36,000 pp", tip: "Arctic Adventure Tours, Tromsø Villmarkssenter — book 3–6 months ahead in peak Feb–March" },
              { name: "Reindeer sleigh ride + Sami cultural camp, joik performance & lávvu dinner (Nov–March)", cost: "₹10,000–14,000 pp" },
              { name: "Snowmobile safari across frozen tundra (Nov–March)", cost: "₹16,000–21,000 pp (2–3 hrs)" },
              { name: "Ice fishing on frozen Arctic lake — included in many winter safari packages" },
            ],
          },
          {
            theme: "Whale Watching & Island Day Trip",
            activities: [
              { name: "Whale watching boat tour — orcas & humpbacks migrate Oct–Jan into fjords near Tromsø", cost: "₹9,300–14,400 pp (3–4 hrs)", tip: "Best Oct–Dec; Brim Explorer or Whale Safari operator" },
              { name: "Sommarøy island day trip (summer) — Arctic white-sand beaches & crystal-clear turquoise fjord, 1 hr drive" },
              { name: "Tromsø University Museum — Arctic archaeology, Sami culture & aurora science exhibit", cost: "₹750 pp" },
              { name: "Midnight Sun boat tour (June–July) — sun never sets; fjord dinner cruise", cost: "₹6,000–9,000 pp" },
            ],
          },
        ],
      },
    },

    connections: [
      { from: "Oslo",           to: "Bergen",       method: "Bergen Line scenic train (7 hrs)",                    cost: "₹1,500–5,000 pp (book vy.no 90 days out)" },
      { from: "Bergen",         to: "Flam",         method: "Train to Myrdal + Flåm Railway descent (3 hrs)",      cost: "₹2,000–3,500 pp" },
      { from: "Bergen",         to: "Voss",         method: "Train direct Bergen Line (1.5 hrs)",                   cost: "₹1,000–1,500 pp" },
      { from: "Bergen",         to: "Alesund",      method: "Express bus Nor-Way (4 hrs) or flight (45 min)",       cost: "₹2,000–6,000 pp" },
      { from: "Flam",           to: "Voss",         method: "Ferry Nærøyfjord to Gudvangen + Bus 950 to Voss",      cost: "₹6,100–7,400 pp combined" },
      { from: "Flam",           to: "Tromso",       method: "Flight via Bergen (connect at BGO, ~5 hrs total)",     cost: "₹10,000–14,000 pp" },
      { from: "Voss",           to: "Alesund",      method: "Bus or drive via E16 + Rv13 (~3.5 hrs)",               cost: "₹1,000–2,000 pp" },
      { from: "Alesund",        to: "Geirangerfjord", method: "Drive via Eagle Road (90 min, summer only)",         cost: "₹500 car toll" },
      { from: "Alesund",        to: "Tromso",       method: "Flight direct (1 hr, Vigra Airport)",                  cost: "₹5,000–10,000 pp" },
      { from: "Geirangerfjord", to: "Tromso",       method: "Flight via Ålesund or Oslo (5–7 hrs total)",           cost: "₹10,000–16,000 pp" },
      { from: "Tromso",         to: "Oslo",         method: "Flight direct (2 hrs)",                                cost: "₹5,000–9,000 pp" },
      { from: "Oslo",           to: "Tromso",       method: "Flight direct (2 hrs)",                                cost: "₹6,000–10,000 pp" },
    ],

    extras: ["Lofoten Islands", "Honningsvåg (Nordkapp)", "Stavanger + Preikestolen", "Trolltunga (hike)", "Lillehammer (skiing)", "Svalbard (polar bears)"],

    cityImages: {
      "Oslo":           ["Oslo City Hall Norway waterfront", "Vigeland Park sculptures Oslo", "Aker Brygge Oslo harbor"],
      "Bergen":         ["Bryggen Wharf Bergen Norway colorful", "Bergen panorama Norway coast", "Floyen mountain Bergen view"],
      "Flam":           ["Flamsbana railway Norway scenic", "Flam village Sognefjord Norway", "Naeroyfjord Norway fjord UNESCO"],
      "Voss":           ["Hardangerfjord Norway scenic reflection", "Sognefjord Norway mountain fjord", "Voss Norway alpine landscape"],
      "Alesund":        ["Alesund art nouveau Norway coast panorama", "Alesund colorful buildings Norway", "Alesund Norway islands sunset"],
      "Geirangerfjord": ["Geirangerfjord Norway cruise UNESCO", "Seven Sisters waterfall Geirangerfjord Norway", "Geirangerfjord green water Norway"],
      "Tromso":         ["Northern Lights Norway aurora borealis Tromso", "Arctic Cathedral Tromso Norway", "Tromso Norway winter snow"],
    },
  },
};
