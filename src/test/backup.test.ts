import { describe, it, expect } from "vitest";
import { importFullBackup, csvEscape, csvCell, importCountriesCSV } from "../utils/backup";
import { LS_KEYS } from "../core/lsKeys";
import type { Country } from "../core/types";

function makeFile(contents: string, name: string, type: string) {
  return new File([contents], name, { type });
}

describe("backup import/export helpers — P0", () => {
  it("restores localStorage data from a valid full backup file", async () => {
    const backup = {
      version: 1,
      exportedAt: "2026-06-15T00:00:00.000Z",
      data: {
        [LS_KEYS.MY_LIST]: ["Japan", "Vietnam"],
        [LS_KEYS.CUSTOMS]: [{ name: "Brazil", lat: -14.2, lng: -51.9, bestMonths: [], budget: "", experiences: [] }],
      },
    };

    const result = await importFullBackup(
      makeFile(JSON.stringify(backup), "backup.json", "application/json"),
    );

    expect(result).toEqual({
      ok: true,
      msg: "Restored 2 items. Reload the page to see changes.",
    });
    expect(JSON.parse(localStorage.getItem(LS_KEYS.MY_LIST) ?? "[]")).toEqual(["Japan", "Vietnam"]);
    expect(JSON.parse(localStorage.getItem(LS_KEYS.CUSTOMS) ?? "[]")).toEqual([
      { name: "Brazil", lat: -14.2, lng: -51.9, bestMonths: [], budget: "", experiences: [] },
    ]);
    expect(localStorage.getItem(LS_KEYS.LAST_BACKUP)).not.toBeNull();
  });

  it("returns an error for an invalid full backup file", async () => {
    const result = await importFullBackup(
      makeFile(JSON.stringify({ version: 1 }), "backup.json", "application/json"),
    );

    expect(result).toEqual({
      ok: false,
      msg: "Invalid backup file — missing data field",
    });
  });

  it("escapes commas, quotes, and newlines for CSV output", () => {
    expect(csvEscape("Tokyo, Japan")).toBe('"Tokyo, Japan"');
    expect(csvEscape('He said "hello"')).toBe('"He said ""hello"""');
    expect(csvEscape("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
  });

  it("converts country fields into CSV-safe cells", () => {
    const country: Country = {
      name: "India",
      lat: 20.5937,
      lng: 78.9629,
      bestMonths: ["October", "November"],
      budget: "₹120K",
      experiences: ["Food", "Culture"],
      cities: [{ name: "Delhi", lat: 28.6139, lng: 77.209 }],
      notes: "Great food, busy streets",
    };

    expect(csvCell(country, "experiences")).toBe("Food; Culture");
    expect(csvCell(country, "notes")).toBe('"Great food, busy streets"');
    expect(csvCell(country, "cities")).toBe(
      '"[{""name"":""Delhi"",""lat"":28.6139,""lng"":77.209}]"',
    );
  });

  it("parses a valid countries CSV file", async () => {
    const csv = [
      "name,region,lat,lng,bestMonths,budget,experiences,notes",
      'Japan,Asia,35.6762,139.6503,"March; April",₹180K,"Food; Temples","Great during sakura"',
    ].join("\n");

    const result = await importCountriesCSV(makeFile(csv, "countries.csv", "text/csv"));

    expect(result.ok).toBe(true);
    expect(result.msg).toBe("Parsed 1 countries");
    expect(result.countries).toEqual([
      {
        name: "Japan",
        region: "Asia",
        lat: 35.6762,
        lng: 139.6503,
        bestMonths: ["March", "April"],
        budget: "₹180K",
        experiences: ["Food", "Temples"],
        notes: "Great during sakura",
      },
    ]);
  });

  it("returns an error when the CSV is missing the name column", async () => {
    const csv = "region,lat,lng\nAsia,35.6762,139.6503";

    const result = await importCountriesCSV(makeFile(csv, "countries.csv", "text/csv"));

    expect(result).toEqual({
      ok: false,
      msg: "CSV must have a 'name' column",
    });
  });

  it("returns an error for an empty CSV file", async () => {
    const result = await importCountriesCSV(makeFile("", "countries.csv", "text/csv"));

    expect(result).toEqual({
      ok: false,
      msg: "CSV has no data rows",
    });
  });
});
