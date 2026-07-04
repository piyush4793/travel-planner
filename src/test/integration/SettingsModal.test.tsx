import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsModal from "../../components/ai/SettingsModal";
import { getActiveProvider, getLLMKeys, saveLLMKeys } from "../../core/utils/ai/llmSettings";
import { LS_KEYS } from "../../core/lsKeys";
import type { BudgetBasis } from "../../core/utils/budget";
import type { Country } from "../../core/types";

const mocks = vi.hoisted(() => ({
  validateKey: vi.fn(),
  exportFullBackup: vi.fn(),
  exportCountriesCSV: vi.fn(),
  exportCountriesXLSX: vi.fn(),
  importCountriesCSV: vi.fn(),
  parseBackupFile: vi.fn(),
  applyBackup: vi.fn(),
}));

vi.mock("../../utils/ai/llmProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils/ai/llmProvider")>();
  return {
    ...actual,
    validateKey: mocks.validateKey,
  };
});

vi.mock("../../utils/backup", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils/backup")>();
  return {
    ...actual,
    exportFullBackup: mocks.exportFullBackup,
    exportCountriesCSV: mocks.exportCountriesCSV,
    exportCountriesXLSX: mocks.exportCountriesXLSX,
    importCountriesCSV: mocks.importCountriesCSV,
    parseBackupFile: mocks.parseBackupFile,
    applyBackup: mocks.applyBackup,
  };
});

vi.mock("../../core/featureFlags", () => ({
  isEnabled: (flag: string) => flag === "llmPlanning" || flag === "searchableHomeCountry",
}));

const baseProps = {
  open: true,
  onClose: vi.fn(),
  onOpenChat: vi.fn(),
  countries: [
    {
      name: "Japan",
      lat: 35.6762,
      lng: 139.6503,
      bestMonths: ["March"],
      budget: "₹2L",
      experiences: ["Food"],
    } satisfies Country,
  ],
  homeCountry: "India",
  onHomeCountryChange: vi.fn(),
  budgetBasis: "couple" as BudgetBasis,
  onBudgetBasisChange: vi.fn(),
};

function renderSettings(overrides: Partial<typeof baseProps> = {}) {
  const props = { ...baseProps, ...overrides };
  return {
    user: userEvent.setup(),
    props,
    ...render(<SettingsModal {...props} />),
  };
}

describe("SettingsModal", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mocks.validateKey.mockResolvedValue({ ok: true });
    mocks.exportFullBackup.mockResolvedValue(undefined);
    mocks.exportCountriesCSV.mockResolvedValue(undefined);
    mocks.exportCountriesXLSX.mockResolvedValue(undefined);
    mocks.importCountriesCSV.mockResolvedValue({ ok: true, countries: [] });
    mocks.parseBackupFile.mockResolvedValue({ ok: false, msg: "bad file" });
    mocks.applyBackup.mockReturnValue({ ok: true, msg: "Restored!" });
  });

  it("renders nothing while closed and shows settings navigation when open", () => {
    const { rerender } = render(<SettingsModal {...baseProps} open={false} />);

    expect(screen.queryByRole("dialog", { name: /settings/i })).not.toBeInTheDocument();

    rerender(<SettingsModal {...baseProps} open />);

    expect(screen.getByRole("dialog", { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: /settings sections/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /general/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /ai/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /backup/i })).toBeInTheDocument();
  });

  it("switches visible panels with SettingsNav clicks and arrow keys", async () => {
    const { user } = renderSettings();

    await user.click(screen.getByRole("tab", { name: /ai/i }));
    expect(screen.getByRole("tabpanel", { name: /ai/i })).toBeInTheDocument();
    expect(screen.getByText(/token pricing reference/i)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /backup/i }));
    expect(screen.getByRole("tabpanel", { name: /backup/i })).toBeInTheDocument();
    expect(screen.getByText(/all your travel data lives in this browser/i)).toBeInTheDocument();

    const backupTab = screen.getByRole("tab", { name: /backup/i });
    backupTab.focus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: /ai/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: /ai/i })).toBeInTheDocument();
  });

  it("saves a validated API key and shows the saved key controls", async () => {
    const { user } = renderSettings();

    await user.click(screen.getByRole("tab", { name: /ai/i }));
    await user.type(screen.getByPlaceholderText("sk-..."), "sk-valid-key");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText(/openai key verified and saved/i)).toBeInTheDocument();
    });
    expect(mocks.validateKey).toHaveBeenCalledWith("openai", "sk-valid-key");
    expect(getLLMKeys()).toEqual({ openai: "sk-valid-key" });
    expect(screen.getByText(/current key/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show/i })).toBeInTheDocument();
  });

  it("shows validation errors without saving the rejected key", async () => {
    mocks.validateKey.mockResolvedValueOnce({ ok: false, error: "Bad API key" });
    const { user } = renderSettings();

    await user.click(screen.getByRole("tab", { name: /ai/i }));
    await user.type(screen.getByPlaceholderText("sk-..."), "sk-invalid");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText("Bad API key")).toBeInTheDocument();
    });
    expect(getLLMKeys()).toEqual({});
  });

  it("persists provider switching and uses the selected provider placeholder", async () => {
    const { user } = renderSettings();

    await user.click(screen.getByRole("tab", { name: /ai/i }));
    await user.click(screen.getByRole("radio", { name: /gemini/i }));

    expect(getActiveProvider()).toBe("gemini");
    expect(screen.getByPlaceholderText("AIza...")).toBeInTheDocument();
    expect(screen.getByText(/gemini keys are sent as a url parameter/i)).toBeInTheDocument();
  });

  it("deletes an existing API key through the confirmation dialog", async () => {
    saveLLMKeys({ openai: "sk-existing-key" });
    const { user } = renderSettings();

    await user.click(screen.getByRole("tab", { name: /ai/i }));
    await user.click(screen.getByRole("button", { name: /show/i }));
    expect(screen.getByText("sk-existing-key")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /delete/i }));
    const dialog = screen.getByRole("alertdialog", { name: /delete api key/i });
    expect(dialog).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.getByText("Key removed.")).toBeInTheDocument();
    });
    expect(getLLMKeys()).toEqual({});
  });

  it("starts AI planning from a saved key by closing settings and opening chat", async () => {
    saveLLMKeys({ openai: "sk-existing-key" });
    const onClose = vi.fn();
    const onOpenChat = vi.fn();
    const { user } = renderSettings({ onClose, onOpenChat });

    await user.click(screen.getByRole("tab", { name: /ai/i }));
    await user.click(screen.getByRole("button", { name: /start planning with ai/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpenChat).toHaveBeenCalledTimes(1);
  });

  it("calls budget and home-country change handlers from General settings", async () => {
    const onBudgetBasisChange = vi.fn();
    const onHomeCountryChange = vi.fn();
    const { user } = renderSettings({ onBudgetBasisChange, onHomeCountryChange });

    await user.click(screen.getByRole("radio", { name: /solo/i }));
    expect(onBudgetBasisChange).toHaveBeenCalledWith("solo");

    await user.click(screen.getByRole("button", { name: /home country: india/i }));
    await user.type(screen.getByRole("combobox"), "Canada");
    await user.click(screen.getByRole("option", { name: /canada/i }));

    expect(onHomeCountryChange).toHaveBeenCalledWith("Canada");
  });

  it("updates backup schedule state and shows export errors when there is no country data", async () => {
    const { user } = renderSettings({ countries: [] });

    await user.click(screen.getByRole("tab", { name: /backup/i }));
    await user.click(screen.getByRole("button", { name: "Weekly" }));
    expect(screen.getByText("Every")).toBeInTheDocument();
    expect(localStorage.getItem(LS_KEYS.BACKUP_FREQUENCY)).toBe(JSON.stringify("weekly"));

    await user.click(screen.getByRole("button", { name: /countries csv/i }));
    expect(screen.getByText("No countries to export")).toBeInTheDocument();
  });

  it("exports a full backup and the countries CSV/XLSX when data is present", async () => {
    const { user } = renderSettings();

    await user.click(screen.getByRole("tab", { name: /backup/i }));

    await user.click(screen.getByRole("button", { name: /Full Backup \(JSON\)/i }));
    expect(mocks.exportFullBackup).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Full backup downloaded/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Countries CSV/i }));
    expect(mocks.exportCountriesCSV).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("CSV exported!")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Countries XLSX/i }));
    expect(mocks.exportCountriesXLSX).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("XLSX exported!")).toBeInTheDocument();
  });

  it("previews a restore file and applies the backup on confirmation", async () => {
    mocks.parseBackupFile.mockResolvedValue({
      ok: true,
      raw: { data: true },
      exportedAt: "2024-01-01T10:00:00Z",
      countryCount: 2,
      tripCount: 1,
      aiPlanCount: 0,
      totalKeys: 5,
    });
    const { user } = renderSettings();

    await user.click(screen.getByRole("tab", { name: /backup/i }));

    const restoreInput = document.querySelector('input[type="file"][accept=".json"]') as HTMLInputElement;
    const file = new File(['{"data":true}'], "backup.json", { type: "application/json" });
    await user.upload(restoreInput, file);

    expect(await screen.findByRole("heading", { name: /Restore Backup/i })).toBeInTheDocument();
    expect(screen.getByText(/2 countries/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Restore Now/i }));
    expect(mocks.applyBackup).toHaveBeenCalledWith({ data: true });
    expect(await screen.findByText("Restored!")).toBeInTheDocument();
  });

  it("shows an error when the restore file cannot be parsed", async () => {
    mocks.parseBackupFile.mockResolvedValue({ ok: false, msg: "Corrupt backup file" });
    const { user } = renderSettings();

    await user.click(screen.getByRole("tab", { name: /backup/i }));
    const restoreInput = document.querySelector('input[type="file"][accept=".json"]') as HTMLInputElement;
    await user.upload(restoreInput, new File(["nope"], "bad.json", { type: "application/json" }));

    expect(await screen.findByText("Corrupt backup file")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Restore Backup/i })).not.toBeInTheDocument();
  });

  it("merges imported countries from a CSV file into custom storage", async () => {
    mocks.importCountriesCSV.mockResolvedValue({
      ok: true,
      countries: [{ name: "Japan", lat: 35, lng: 139, bestMonths: [], budget: "₹1L", experiences: [] } as Country],
    });
    localStorage.setItem(LS_KEYS.CUSTOMS, JSON.stringify([{ name: "Japan", lat: 0, lng: 0, bestMonths: [], budget: "₹0", experiences: [] }]));
    const { user } = renderSettings();

    await user.click(screen.getByRole("tab", { name: /backup/i }));
    const importInput = document.querySelector('input[type="file"][accept=".csv"]') as HTMLInputElement;
    await user.upload(importInput, new File(["csv"], "countries.csv", { type: "text/csv" }));

    expect(mocks.importCountriesCSV).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Imported 1 countries/i)).toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem(LS_KEYS.CUSTOMS)!) as Country[];
    expect(stored).toHaveLength(1);
    expect(stored[0].budget).toBe("₹1L");
  });

  it("persists the weekly backup weekday through the schedule selector", async () => {
    const { user } = renderSettings();

    await user.click(screen.getByRole("tab", { name: /backup/i }));
    await user.click(screen.getByRole("button", { name: "Weekly" }));
    await user.selectOptions(screen.getByRole("combobox"), "Wednesday");

    const stored = JSON.parse(localStorage.getItem(LS_KEYS.BACKUP_SCHEDULE)!) as { weekday: number };
    expect(stored.weekday).toBe(3);
  });

  it("calls onClose from the close button", async () => {
    const onClose = vi.fn();
    const { user } = renderSettings({ onClose });

    await user.click(screen.getByRole("button", { name: /close settings/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
