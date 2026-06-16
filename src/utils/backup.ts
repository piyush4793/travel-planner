import { LS_KEYS } from "../core/lsKeys";
import { loadLS, saveLS, getStorageAdapter } from "../core/storage";
import type { Country } from "../core/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BackupFrequency = "daily" | "weekly" | "monthly" | "never";

/** 0 = Sunday … 6 = Saturday */
export type BackupSchedule = {
  weekday?: number;
  monthDay?: number;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type BackupData = {
  version: number;
  exportedAt: string;
  data: Record<string, unknown>;
};

const CURRENT_BACKUP_VERSION = 1;

// Keys to include in full backup (exclude backup-meta keys themselves)
const BACKUP_KEYS = [
  LS_KEYS.MY_LIST,
  LS_KEYS.VISITED,
  LS_KEYS.FAVORITES,
  LS_KEYS.CUSTOMS,
  LS_KEYS.DELETED,
  LS_KEYS.HOME_COUNTRY,
  LS_KEYS.TRIP_CUSTOMS,
  LS_KEYS.TRIP_DELETED,
  LS_KEYS.FEATURES,
  LS_KEYS.LLM_PROVIDER,
  LS_KEYS.AI_PLANS,
  // LLM_KEYS intentionally excluded — sensitive API keys shouldn't be in backup files
] as const;

// ─── JSON Full Backup ─────────────────────────────────────────────────────────

function buildBackupBlob(): Blob {
  const storage = getStorageAdapter();
  const data: Record<string, unknown> = {};
  for (const key of BACKUP_KEYS) {
    const raw = storage.getItem(key);
    if (raw !== null) {
      try { data[key] = JSON.parse(raw); } catch { data[key] = raw; }
    }
  }

  const backup: BackupData = {
    version: CURRENT_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };

  return new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
}

/** Manual export — opens "Save As" dialog when supported */
export async function exportFullBackup(): Promise<void> {
  const filename = `roamwise-backup-${dateStamp()}.json`;
  await saveBlob(buildBackupBlob(), filename, "application/json");
  saveLS(LS_KEYS.LAST_BACKUP, new Date().toISOString());
}

/** Silent auto-backup — no dialog, downloads to default folder */
function autoExportBackup(): void {
  downloadBlob(buildBackupBlob(), `roamwise-backup-${dateStamp()}.json`);
  saveLS(LS_KEYS.LAST_BACKUP, new Date().toISOString());
}

export type BackupPreview = {
  ok: true;
  exportedAt: string;
  countryCount: number;
  tripCount: number;
  aiPlanCount: number;
  totalKeys: number;
  raw: BackupData;
} | {
  ok: false;
  msg: string;
};

export function parseBackupFile(file: File): Promise<BackupPreview> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!parsed || typeof parsed !== "object" || !parsed.data) {
          resolve({ ok: false, msg: "Invalid backup file — missing data field" });
          return;
        }
        if (typeof parsed.version !== "number" || parsed.version > CURRENT_BACKUP_VERSION) {
          resolve({ ok: false, msg: `Unsupported backup version (${parsed.version ?? "unknown"}). Please update the app.` });
          return;
        }
        const data = parsed.data as Record<string, unknown>;
        // Validate that data keys are from expected set
        const knownKeys = new Set<string>(BACKUP_KEYS);
        const unknownKeys = Object.keys(data).filter((k) => !knownKeys.has(k));
        if (unknownKeys.length > 5) {
          resolve({ ok: false, msg: "Backup contains too many unrecognized keys — may be corrupted" });
          return;
        }
        const myList = Array.isArray(data[LS_KEYS.MY_LIST]) ? (data[LS_KEYS.MY_LIST] as unknown[]).length : 0;
        const customs = Array.isArray(data[LS_KEYS.CUSTOMS]) ? (data[LS_KEYS.CUSTOMS] as unknown[]).length : 0;
        const trips = Array.isArray(data[LS_KEYS.TRIP_CUSTOMS]) ? (data[LS_KEYS.TRIP_CUSTOMS] as unknown[]).length : 0;
        const aiPlans = data[LS_KEYS.AI_PLANS] && typeof data[LS_KEYS.AI_PLANS] === "object"
          ? Object.values(data[LS_KEYS.AI_PLANS] as Record<string, unknown[]>).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
          : 0;
        const totalKeys = BACKUP_KEYS.filter((k) => k in data).length;
        resolve({
          ok: true,
          exportedAt: parsed.exportedAt ?? "Unknown",
          countryCount: Math.max(myList, customs),
          tripCount: trips,
          aiPlanCount: aiPlans,
          totalKeys,
          raw: parsed as BackupData,
        });
      } catch {
        resolve({ ok: false, msg: "Could not parse backup file — invalid JSON" });
      }
    };
    reader.onerror = () => resolve({ ok: false, msg: "Failed to read file" });
    reader.readAsText(file);
  });
}

export function applyBackup(backup: BackupData): { ok: boolean; msg: string } {
  if (typeof backup.version !== "number" || backup.version > CURRENT_BACKUP_VERSION) {
    return { ok: false, msg: `Unsupported backup version (${backup.version}). Please update the app.` };
  }
  try {
    const storage = getStorageAdapter();
    const data = backup.data;
    let restored = 0;
    for (const key of BACKUP_KEYS) {
      if (key in data) {
        storage.setItem(key, JSON.stringify(data[key]));
        restored++;
      }
    }
    saveLS(LS_KEYS.LAST_BACKUP, new Date().toISOString());
    return { ok: true, msg: `Restored ${restored} items. Reload the page to see changes.` };
  } catch {
    return { ok: false, msg: "Failed to apply backup" };
  }
}

export function importFullBackup(file: File): Promise<{ ok: boolean; msg: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!parsed || typeof parsed !== "object" || !parsed.data) {
          resolve({ ok: false, msg: "Invalid backup file — missing data field" });
          return;
        }
        if (typeof parsed.version !== "number" || parsed.version > CURRENT_BACKUP_VERSION) {
          resolve({ ok: false, msg: `Unsupported backup version (${parsed.version ?? "unknown"}). Please update the app.` });
          return;
        }

        const data = parsed.data as Record<string, unknown>;
        const storage = getStorageAdapter();
        let restored = 0;

        for (const key of BACKUP_KEYS) {
          if (key in data) {
            storage.setItem(key, JSON.stringify(data[key]));
            restored++;
          }
        }

        saveLS(LS_KEYS.LAST_BACKUP, new Date().toISOString());
        resolve({ ok: true, msg: `Restored ${restored} items. Reload the page to see changes.` });
      } catch {
        resolve({ ok: false, msg: "Could not parse backup file — invalid JSON" });
      }
    };
    reader.onerror = () => resolve({ ok: false, msg: "Failed to read file" });
    reader.readAsText(file);
  });
}

// ─── CSV Export/Import (Countries) ────────────────────────────────────────────

const CSV_COLUMNS = [
  "name", "region", "lat", "lng", "bestMonths", "worstMonths",
  "budget", "experiences", "travelStyle", "combo", "avoid",
  "landmark", "stopoverNote", "notes", "cities",
] as const;

export async function exportCountriesCSV(countries: Country[]): Promise<void> {
  const header = CSV_COLUMNS.join(",");
  const rows = countries.map((c) =>
    CSV_COLUMNS.map((col) => csvCell(c, col)).join(",")
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  await saveBlob(blob, `roamwise-countries-${dateStamp()}.csv`, "text/csv");
}

export function csvCell(country: Country, col: string): string {
  const val = (country as Record<string, unknown>)[col];
  if (val === undefined || val === null) return "";
  if (col === "cities" && Array.isArray(val)) {
    return csvEscape(JSON.stringify(val));
  }
  if (Array.isArray(val)) return csvEscape(val.join("; "));
  if (typeof val === "object") return csvEscape(JSON.stringify(val));
  return csvEscape(String(val));
}

export function csvEscape(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function importCountriesCSV(file: File): Promise<{ ok: boolean; msg: string; countries?: Country[] }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const rows = parseCSVRows(text);
        if (rows.length < 2) {
          resolve({ ok: false, msg: "CSV has no data rows" });
          return;
        }

        const headers = rows[0].map((h) => h.trim().toLowerCase());
        const nameIdx = headers.indexOf("name");
        if (nameIdx < 0) {
          resolve({ ok: false, msg: "CSV must have a 'name' column" });
          return;
        }

        const countries: Country[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row[nameIdx]?.trim()) continue;
          countries.push(rowToCountry(headers, row));
        }

        resolve({ ok: true, msg: `Parsed ${countries.length} countries`, countries });
      } catch (err) {
        resolve({ ok: false, msg: `CSV parse error: ${err instanceof Error ? err.message : "unknown"}` });
      }
    };
    reader.onerror = () => resolve({ ok: false, msg: "Failed to read file" });
    reader.readAsText(file);
  });
}

function rowToCountry(headers: string[], row: string[]): Country {
  const get = (col: string) => row[headers.indexOf(col)]?.trim() ?? "";
  const getArray = (col: string) => {
    const v = get(col);
    return v ? v.split(";").map((s) => s.trim()).filter(Boolean) : [];
  };

  const country: Country = {
    name: get("name"),
    lat: parseFloat(get("lat")) || 0,
    lng: parseFloat(get("lng")) || 0,
    bestMonths: getArray("bestmonths"),
    budget: get("budget") || "₹100K",
    experiences: getArray("experiences"),
  };

  const region = get("region"); if (region) country.region = region;
  const worstMonths = getArray("worstmonths"); if (worstMonths.length) country.worstMonths = worstMonths;
  const travelStyle = getArray("travelstyle"); if (travelStyle.length) country.travelStyle = travelStyle as Country["travelStyle"];
  const combo = getArray("combo"); if (combo.length) country.combo = combo;
  const avoid = getArray("avoid"); if (avoid.length) country.avoid = avoid;
  const landmark = get("landmark"); if (landmark) country.landmark = landmark;
  const stopoverNote = get("stopovernote"); if (stopoverNote) country.stopoverNote = stopoverNote;
  const notes = get("notes"); if (notes) country.notes = notes;

  const citiesRaw = get("cities");
  if (citiesRaw) {
    try { country.cities = JSON.parse(citiesRaw); } catch { /* skip malformed cities */ }
  }

  return country;
}

// RFC 4180 CSV parser — handles quoted fields with embedded commas/newlines
function parseCSVRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuote = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); cell = "";
        if (row.some((c) => c.trim())) rows.push(row);
        row = [];
      } else {
        cell += ch;
      }
    }
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

// ─── XLSX Export (Countries) ──────────────────────────────────────────────────
// Generates Office Open XML manually — no npm dependencies

export async function exportCountriesXLSX(countries: Country[]): Promise<void> {
  const sheetData = [CSV_COLUMNS as unknown as string[]];
  for (const c of countries) {
    sheetData.push(CSV_COLUMNS.map((col) => {
      const val = (c as Record<string, unknown>)[col];
      if (val === undefined || val === null) return "";
      if (col === "cities" && Array.isArray(val)) return JSON.stringify(val);
      if (Array.isArray(val)) return val.join("; ");
      if (typeof val === "object") return JSON.stringify(val);
      return String(val);
    }));
  }

  const blob = buildXLSX(sheetData);
  const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  await saveBlob(blob, `roamwise-countries-${dateStamp()}.xlsx`, mime);
}

function buildXLSX(rows: string[][]): Blob {
  // Shared strings table — deduplicate all cell values
  const sst = new Map<string, number>();
  const sstList: string[] = [];
  for (const row of rows) {
    for (const cell of row) {
      if (!sst.has(cell)) { sst.set(cell, sstList.length); sstList.push(cell); }
    }
  }

  const xmlEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // Sheet XML
  const colLetter = (i: number) => String.fromCharCode(65 + (i % 26));
  let sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  sheetXml += '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
  sheetXml += "<sheetData>";
  for (let r = 0; r < rows.length; r++) {
    sheetXml += `<row r="${r + 1}">`;
    for (let c = 0; c < rows[r].length; c++) {
      const ref = `${colLetter(c)}${r + 1}`;
      const idx = sst.get(rows[r][c])!;
      sheetXml += `<c r="${ref}" t="s"><v>${idx}</v></c>`;
    }
    sheetXml += "</row>";
  }
  sheetXml += "</sheetData></worksheet>";

  // SST XML
  let sstXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  sstXml += `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sst.size}" uniqueCount="${sst.size}">`;
  for (const s of sstList) sstXml += `<si><t>${xmlEsc(s)}</t></si>`;
  sstXml += "</sst>";

  const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
    "</Types>";

  const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    "</Relationships>";

  const workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>' +
    "</Relationships>";

  const workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    "<sheets>" +
    '<sheet name="Countries" sheetId="1" r:id="rId1"/>' +
    "</sheets></workbook>";

  const files: [string, Uint8Array][] = [
    ["[Content_Types].xml", strToBytes(contentTypes)],
    ["_rels/.rels", strToBytes(rels)],
    ["xl/workbook.xml", strToBytes(workbook)],
    ["xl/_rels/workbook.xml.rels", strToBytes(workbookRels)],
    ["xl/worksheets/sheet1.xml", strToBytes(sheetXml)],
    ["xl/sharedStrings.xml", strToBytes(sstXml)],
  ];

  return buildZip(files);
}

// ─── Backup Reminder ──────────────────────────────────────────────────────────

export function getBackupFrequency(): BackupFrequency {
  return loadLS<BackupFrequency>(LS_KEYS.BACKUP_FREQUENCY, "monthly");
}

export function setBackupFrequency(freq: BackupFrequency): void {
  saveLS(LS_KEYS.BACKUP_FREQUENCY, freq);
}

export function getBackupSchedule(): BackupSchedule {
  return loadLS<BackupSchedule>(LS_KEYS.BACKUP_SCHEDULE, { weekday: 0, monthDay: 1 });
}

export function setBackupSchedule(schedule: BackupSchedule): void {
  saveLS(LS_KEYS.BACKUP_SCHEDULE, schedule);
}

export function isBackupOverdue(): boolean {
  const freq = getBackupFrequency();
  if (freq === "never") return false;

  const last = loadLS<string>(LS_KEYS.LAST_BACKUP, "");
  if (!last) {
    // First launch or no backup ever — only nag if user has actual data
    const hasCustoms = (loadLS<unknown[]>(LS_KEYS.CUSTOMS, [])?.length ?? 0) > 0;
    const hasTrips = (loadLS<unknown[]>(LS_KEYS.TRIP_CUSTOMS, [])?.length ?? 0) > 0;
    const hasPlans = Object.keys(loadLS<Record<string, unknown>>(LS_KEYS.AI_PLANS, {}) ?? {}).length > 0;
    if (!hasCustoms && !hasTrips && !hasPlans) return false;
    return true;
  }

  const lastDate = new Date(last).getTime();
  if (isNaN(lastDate)) return true;

  const now = new Date();
  const msInDay = 86400000;

  if (freq === "daily") return now.getTime() - lastDate > msInDay;

  if (freq === "weekly") {
    const schedule = getBackupSchedule();
    const targetDay = schedule.weekday ?? 0;
    if (now.getTime() - lastDate < msInDay) return false;
    const lastBackupDate = new Date(lastDate);
    const daysSince = Math.floor((now.getTime() - lastDate) / msInDay);
    if (daysSince >= 7) return true;
    for (let d = 1; d <= daysSince; d++) {
      const check = new Date(lastBackupDate.getTime() + d * msInDay);
      if (check.getDay() === targetDay) return true;
    }
    return false;
  }

  if (freq === "monthly") {
    const schedule = getBackupSchedule();
    const targetDate = schedule.monthDay ?? 1;
    if (now.getTime() - lastDate < msInDay) return false;
    const lastBackupDate = new Date(lastDate);
    if (now.getDate() >= targetDate) {
      const targetThisMonth = new Date(now.getFullYear(), now.getMonth(), targetDate);
      return lastBackupDate < targetThisMonth;
    }
    const targetLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, targetDate);
    return lastBackupDate < targetLastMonth;
  }

  return false;
}

/** Auto-backup: triggers download silently when overdue. Returns true if backup was triggered. */
export function autoBackupIfOverdue(): boolean {
  if (!isBackupOverdue()) return false;
  autoExportBackup();
  return true;
}

export function getLastBackupLabel(): string {
  const last = loadLS<string>(LS_KEYS.LAST_BACKUP, "");
  if (!last) return "Never";
  const d = new Date(last);
  if (isNaN(d.getTime())) return "Never";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function getNextBackupLabel(): string {
  const freq = getBackupFrequency();
  if (freq === "never") return "Disabled";
  if (freq === "daily") return "Tomorrow";

  const schedule = getBackupSchedule();
  const now = new Date();

  if (freq === "weekly") {
    const targetDay = schedule.weekday ?? 0;
    const daysUntil = (targetDay - now.getDay() + 7) % 7 || 7;
    const next = new Date(now.getTime() + daysUntil * 86400000);
    return `${DAY_NAMES[targetDay]}, ${next.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }

  if (freq === "monthly") {
    const targetDate = schedule.monthDay ?? 1;
    let next: Date;
    if (now.getDate() < targetDate) {
      next = new Date(now.getFullYear(), now.getMonth(), targetDate);
    } else {
      next = new Date(now.getFullYear(), now.getMonth() + 1, targetDate);
    }
    return next.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  return "";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Manual save — opens native "Save As" dialog when supported, falls back to download */
async function saveBlob(blob: Blob, filename: string, mimeType: string): Promise<void> {
  if ("showSaveFilePicker" in window) {
    try {
      const ext = filename.split(".").pop() ?? "";
      const handle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> })
        .showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: ext.toUpperCase() + " file", accept: { [mimeType]: ["." + ext] } }],
        });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }
  downloadBlob(blob, filename);
}

/** Silent download — used by auto-backup and mobile fallback */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  // Delay revocation so browser has time to start the download
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 500);
}

function dateStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function strToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

// Minimal ZIP builder (store-only, no compression)
function buildZip(files: [string, Uint8Array][]): Blob {
  const parts: Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  let offset = 0;

  for (const [name, data] of files) {
    const nameBytes = strToBytes(name);
    const crc = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(8, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    parts.push(local, data);

    const cd = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(10, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    cd.set(nameBytes, 46);
    centralDir.push(cd);

    offset += 30 + nameBytes.length + data.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const cd of centralDir) cdSize += cd.length;

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdOffset, true);

  const allParts = [...parts, ...centralDir, eocd].map(
    (u) => u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer
  );
  return new Blob(allParts, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
