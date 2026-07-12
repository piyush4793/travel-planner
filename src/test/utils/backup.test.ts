import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  autoBackupIfOverdue,
  csvCell,
  csvEscape,
  exportCountriesCSV,
  exportCountriesXLSX,
  exportFullBackup,
  getBackupFrequency,
  getBackupSchedule,
  getLastBackupLabel,
  getNextBackupLabel,
  importCountriesCSV,
  importFullBackup,
  isBackupOverdue,
  parseBackupFile,
  applyBackup,
  setBackupFrequency,
  setBackupSchedule,
} from "@/utils/backup.ts";
import { LS_KEYS } from "@/core/lsKeys.ts";
import type { Country } from "@/core/types.ts";

function createFile(content: string, name = "test.json"): File {
  return new File([content], name, { type: "application/json" });
}

function installSavePicker() {
  const blobs: Blob[] = [];
  const write = vi.fn(async (blob: Blob) => {
    blobs.push(blob);
  });
  const close = vi.fn(async () => {});
  const createWritable = vi.fn(async () => ({ write, close }));
  const showSaveFilePicker = vi.fn(async () => ({ createWritable }));

  Object.defineProperty(window, "showSaveFilePicker", {
    configurable: true,
    writable: true,
    value: showSaveFilePicker,
  });

  return { blobs, write, close, createWritable, showSaveFilePicker };
}

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

function readBlobAsBytes(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

describe("backup import/export helpers — P0", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("restores localStorage data from a valid full backup file", async () => {
    const backup = {
      version: 1,
      exportedAt: "2026-06-15T00:00:00.000Z",
      data: {
        [LS_KEYS.MY_LIST]: ["Japan", "Vietnam"],
        [LS_KEYS.CUSTOMS]: [{ name: "Brazil", lat: -14.2, lng: -51.9, bestMonths: [], budget: "", experiences: [] }],
      },
    };

    const result = await importFullBackup(createFile(JSON.stringify(backup), "backup.json"));

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
    const result = await importFullBackup(createFile(JSON.stringify({ version: 1 }), "backup.json"));

    expect(result).toEqual({
      ok: false,
      msg: "Invalid backup file — missing data field",
    });
  });

  it("previews a valid backup file with country, trip, and AI-plan counts", async () => {
    const backup = {
      version: 1,
      exportedAt: "2026-06-15T00:00:00.000Z",
      data: {
        [LS_KEYS.MY_LIST]: ["Japan", "Vietnam", "Peru"],
        [LS_KEYS.CUSTOMS]: [{ name: "Brazil" }],
        [LS_KEYS.SAVED_TRIPS]: [{ id: "t1", name: "Japan", stops: [] }],
        [LS_KEYS.AI_PLANS]: { Japan: [{ id: "a" }, { id: "b" }], Peru: [{ id: "c" }] },
      },
    };

    const preview = await parseBackupFile(createFile(JSON.stringify(backup), "backup.json"));

    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.countryCount).toBe(3);
    expect(preview.tripCount).toBe(1);
    expect(preview.aiPlanCount).toBe(3);
    expect(preview.totalKeys).toBe(4);
    expect(preview.exportedAt).toBe("2026-06-15T00:00:00.000Z");
  });

  it("rejects a backup preview with a missing data field or a future version", async () => {
    const noData = await parseBackupFile(createFile(JSON.stringify({ version: 1 }), "b.json"));
    expect(noData).toEqual({ ok: false, msg: "Invalid backup file — missing data field" });

    const future = await parseBackupFile(createFile(JSON.stringify({ version: 999, data: {} }), "b.json"));
    expect(future.ok).toBe(false);
    if (!future.ok) expect(future.msg).toMatch(/Unsupported backup version/);
  });

  it("rejects a backup preview with too many unknown keys or invalid JSON", async () => {
    const junk = { version: 1, data: { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 } };
    const tooMany = await parseBackupFile(createFile(JSON.stringify(junk), "b.json"));
    expect(tooMany).toEqual({ ok: false, msg: "Backup contains too many unrecognized keys — may be corrupted" });

    const bad = await parseBackupFile(createFile("{not json", "b.json"));
    expect(bad).toEqual({ ok: false, msg: "Could not parse backup file — invalid JSON" });
  });

  it("applies a valid backup to storage and rejects an unsupported version", () => {
    const ok = applyBackup({
      version: 1,
      exportedAt: "2026-06-15T00:00:00.000Z",
      data: { [LS_KEYS.MY_LIST]: ["Japan"], [LS_KEYS.FAVORITES]: ["Japan"] },
    });
    expect(ok.ok).toBe(true);
    expect(ok.msg).toMatch(/Restored 2 items/);
    expect(JSON.parse(localStorage.getItem(LS_KEYS.MY_LIST) ?? "[]")).toEqual(["Japan"]);
    expect(localStorage.getItem(LS_KEYS.LAST_BACKUP)).not.toBeNull();

    const bad = applyBackup({ version: 999, exportedAt: "", data: {} } as never);
    expect(bad.ok).toBe(false);
    expect(bad.msg).toMatch(/Unsupported backup version/);
  });

  it("skips malformed keys on apply so corrupt data can't poison storage", () => {
    localStorage.setItem(LS_KEYS.VISITED, JSON.stringify(["Japan"]));
    const result = applyBackup({
      version: 1,
      exportedAt: "2026-06-15T00:00:00.000Z",
      data: {
        [LS_KEYS.MY_LIST]: ["Japan", "Peru"],          // valid string[]
        [LS_KEYS.VISITED]: { not: "an array" },        // invalid — must be skipped
        [LS_KEYS.CUSTOMS]: [{ noName: true }],         // invalid — entries need a name
        [LS_KEYS.FAVORITES]: [1, 2, 3],                // invalid — not strings
      },
    });
    expect(result.ok).toBe(true);
    expect(result.msg).toMatch(/Restored 1 items \(3 skipped — invalid format\)/);
    // Valid key written; malformed keys left untouched
    expect(JSON.parse(localStorage.getItem(LS_KEYS.MY_LIST) ?? "[]")).toEqual(["Japan", "Peru"]);
    expect(JSON.parse(localStorage.getItem(LS_KEYS.VISITED) ?? "[]")).toEqual(["Japan"]);
    expect(localStorage.getItem(LS_KEYS.CUSTOMS)).toBeNull();
    expect(localStorage.getItem(LS_KEYS.FAVORITES)).toBeNull();
  });

  it("skips malformed keys on file import", async () => {
    const backup = {
      version: 1,
      exportedAt: "2026-06-15T00:00:00.000Z",
      data: {
        [LS_KEYS.MY_LIST]: ["Japan"],
        [LS_KEYS.AI_PLANS]: "corrupt-string",          // invalid — must be a record of arrays
      },
    };
    const result = await importFullBackup(createFile(JSON.stringify(backup), "backup.json"));
    expect(result.ok).toBe(true);
    expect(result.msg).toMatch(/Restored 1 items \(1 skipped — invalid format\)/);
    expect(localStorage.getItem(LS_KEYS.AI_PLANS)).toBeNull();
  });

  it("gets and sets backup frequency with a monthly default", () => {
    expect(getBackupFrequency()).toBe("monthly");

    setBackupFrequency("daily");

    expect(getBackupFrequency()).toBe("daily");
    expect(localStorage.getItem(LS_KEYS.BACKUP_FREQUENCY)).toBe(JSON.stringify("daily"));
  });

  it("gets and sets backup schedule with sensible defaults", () => {
    expect(getBackupSchedule()).toEqual({ weekday: 0, monthDay: 1 });

    setBackupSchedule({ weekday: 3, monthDay: 15 });

    expect(getBackupSchedule()).toEqual({ weekday: 3, monthDay: 15 });
    expect(JSON.parse(localStorage.getItem(LS_KEYS.BACKUP_SCHEDULE) ?? "{}")).toEqual({
      weekday: 3,
      monthDay: 15,
    });
  });

  it("treats never frequency as never overdue", () => {
    setBackupFrequency("never");
    localStorage.setItem(LS_KEYS.CUSTOMS, JSON.stringify([{ name: "Japan" }]));

    expect(isBackupOverdue()).toBe(false);
  });

  it("does not nag when there is no last backup and no user data", () => {
    setBackupFrequency("monthly");

    expect(isBackupOverdue()).toBe(false);
  });

  it("is overdue when there is no last backup but user customs data exists", () => {
    setBackupFrequency("monthly");
    localStorage.setItem(LS_KEYS.CUSTOMS, JSON.stringify([{ name: "Japan" }]));

    expect(isBackupOverdue()).toBe(true);
  });

  it("checks daily backup schedules across the 24-hour threshold", () => {
    setBackupFrequency("daily");

    localStorage.setItem(
      LS_KEYS.LAST_BACKUP,
      JSON.stringify(new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()),
    );
    expect(isBackupOverdue()).toBe(true);

    localStorage.setItem(
      LS_KEYS.LAST_BACKUP,
      JSON.stringify(new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()),
    );
    expect(isBackupOverdue()).toBe(false);
  });

  it("formats last and next backup labels", () => {
    expect(getLastBackupLabel()).toBe("Never");

    const dateSpy = vi.spyOn(Date.prototype, "toLocaleDateString").mockReturnValue("Jun 15, 2026, 09:00 PM");
    localStorage.setItem(LS_KEYS.LAST_BACKUP, JSON.stringify("2026-06-15T15:30:00.000Z"));
    expect(getLastBackupLabel()).toBe("Jun 15, 2026, 09:00 PM");

    setBackupFrequency("never");
    expect(getNextBackupLabel()).toBe("Disabled");

    setBackupFrequency("daily");
    expect(getNextBackupLabel()).toBe("Tomorrow");

    dateSpy.mockRestore();
  });

  it("handles weekly and monthly overdue schedules", () => {
    vi.useFakeTimers();

    vi.setSystemTime(new Date("2026-06-17T12:00:00.000Z"));
    setBackupFrequency("weekly");
    setBackupSchedule({ weekday: 1, monthDay: 15 });
    localStorage.setItem(LS_KEYS.LAST_BACKUP, JSON.stringify("2026-06-14T08:00:00.000Z"));
    expect(isBackupOverdue()).toBe(true);
    expect(getNextBackupLabel()).toContain("Mon, ");

    setBackupFrequency("monthly");
    setBackupSchedule({ monthDay: 15, weekday: 1 });
    localStorage.setItem(LS_KEYS.LAST_BACKUP, JSON.stringify("2026-06-10T08:00:00.000Z"));
    expect(isBackupOverdue()).toBe(true);

    localStorage.setItem(LS_KEYS.LAST_BACKUP, JSON.stringify("2026-06-16T08:00:00.000Z"));
    expect(isBackupOverdue()).toBe(false);

    // Monthly next-label branches: before the target day (this month) and after it (next month)
    setBackupSchedule({ monthDay: 20, weekday: 1 });
    vi.setSystemTime(new Date("2026-06-10T12:00:00.000Z"));
    expect(getNextBackupLabel()).toBeTruthy();
    vi.setSystemTime(new Date("2026-06-25T12:00:00.000Z"));
    expect(getNextBackupLabel()).toBeTruthy();

    vi.useRealTimers();
  });

  it("escapes commas, quotes, and newlines for CSV output", () => {
    expect(csvEscape("Tokyo, Japan")).toBe('"Tokyo, Japan"');
    expect(csvEscape('He said "hello"')).toBe('"He said ""hello"""');
    expect(csvEscape("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
  });

  it("converts arrays, objects, undefined values, and cities into CSV-safe cells", () => {
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

    expect(csvCell(country, "bestMonths")).toBe("October; November");
    expect(csvCell(country, "experiences")).toBe("Food; Culture");
    expect(csvCell(country, "cities")).toBe('"[{""name"":""Delhi"",""lat"":28.6139,""lng"":77.209}]"');
    expect(csvCell({ ...country, meta: { label: "Guide", url: "https://example.com" } } as Country, "meta")).toBe(
      '"{""label"":""Guide"",""url"":""https://example.com""}"',
    );
    expect(csvCell(country, "unknownColumn")).toBe("");
  });

  it("parses quoted CSV rows and maps them into country objects", async () => {
    const csv = [
      "name,region,lat,lng,bestMonths,worstMonths,budget,experiences,travelStyle,combo,avoid,landmark,stopoverNote,notes,cities",
      'Japan,Asia,35.6762,139.6503,"March; April","June; July",₹180K,"Food; Temples","touch-and-go; explorer","South Korea; Taiwan","Typhoon season",Fuji,"Great stopover","Line 1, with comma\nLine 2","[{""name"":""Tokyo"",""lat"":35.6,""lng"":139.7,""bestMonths"":[""March""],""notes"":""Big city""}]"',
      ',Asia,0,0,,,,,,,,,,',
    ].join("\n");

    const result = await importCountriesCSV(createFile(csv, "countries.csv"));

    expect(result).toEqual({
      ok: true,
      msg: "Parsed 1 countries",
      countries: [
        {
          name: "Japan",
          region: "Asia",
          lat: 35.6762,
          lng: 139.6503,
          bestMonths: ["March", "April"],
          worstMonths: ["June", "July"],
          budget: "₹180K",
          experiences: ["Food", "Temples"],
          travelStyle: ["touch-and-go", "explorer"],
          combo: ["South Korea", "Taiwan"],
          avoid: ["Typhoon season"],
          landmark: "Fuji",
          stopoverNote: "Great stopover",
          notes: "Line 1, with comma\nLine 2",
          cities: [{ name: "Tokyo", lat: 35.6, lng: 139.7, bestMonths: ["March"], notes: "Big city" }],
        },
      ],
    });
  });

  it("exports full backups, CSV, and XLSX files through the save picker", async () => {
    const picker = installSavePicker();
    localStorage.setItem(LS_KEYS.MY_LIST, JSON.stringify(["Japan"]));
    localStorage.setItem(LS_KEYS.CUSTOMS, JSON.stringify([{ name: "Japan" }]));
    localStorage.setItem(LS_KEYS.BUDGET_BASIS, JSON.stringify("family4"));
    localStorage.setItem(LS_KEYS.LLM_KEYS, JSON.stringify({ openai: "secret" }));

    const country: Country = {
      name: "Japan",
      region: "Asia",
      lat: 35.6762,
      lng: 139.6503,
      bestMonths: ["March"],
      budget: "₹180K",
      experiences: ["Food"],
      cities: [{ name: "Tokyo", lat: 35.6, lng: 139.7 }],
    };

    await exportFullBackup();
    await exportCountriesCSV([country]);
    await exportCountriesXLSX([country]);

    expect(picker.showSaveFilePicker).toHaveBeenCalledTimes(3);
    expect(localStorage.getItem(LS_KEYS.LAST_BACKUP)).not.toBeNull();

    const backupJson = JSON.parse(await readBlobAsText(picker.blobs[0])) as {
      data: Record<string, unknown>;
    };
    expect(backupJson.data[LS_KEYS.MY_LIST]).toEqual(["Japan"]);
    expect(backupJson.data[LS_KEYS.CUSTOMS]).toEqual([{ name: "Japan" }]);
    expect(backupJson.data[LS_KEYS.BUDGET_BASIS]).toBe("family4");
    expect(backupJson.data[LS_KEYS.LLM_KEYS]).toBeUndefined();

    const csvText = await readBlobAsText(picker.blobs[1]);
    expect(csvText).toContain("name,region,lat,lng");
    expect(csvText).toContain("Japan,Asia,35.6762,139.6503");

    const xlsxBytes = await readBlobAsBytes(picker.blobs[2]);
    expect(picker.blobs[2].type).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(Array.from(xlsxBytes.slice(0, 4))).toEqual([80, 75, 3, 4]);
  });

  it("triggers an automatic download when overdue", () => {
    vi.useFakeTimers();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(() => "blob:test"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    localStorage.setItem(LS_KEYS.CUSTOMS, JSON.stringify([{ name: "Japan" }]));
    setBackupFrequency("monthly");

    expect(autoBackupIfOverdue()).toBe(true);
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(document.querySelectorAll("a[download]").length).toBe(1);

    vi.runAllTimers();

    expect(document.querySelectorAll("a[download]").length).toBe(0);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });

  it("returns an error when the CSV is missing the name column", async () => {
    const csv = "region,lat,lng\nAsia,35.6762,139.6503";

    const result = await importCountriesCSV(createFile(csv, "countries.csv"));

    expect(result).toEqual({
      ok: false,
      msg: "CSV must have a 'name' column",
    });
  });

  it("returns an error for an empty CSV file", async () => {
    const result = await importCountriesCSV(createFile("", "countries.csv"));

    expect(result).toEqual({
      ok: false,
      msg: "CSV has no data rows",
    });
  });
});
