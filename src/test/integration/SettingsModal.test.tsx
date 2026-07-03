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
}));

vi.mock("../../utils/ai/llmProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils/ai/llmProvider")>();
  return {
    ...actual,
    validateKey: mocks.validateKey,
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
    await user.selectOptions(screen.getByRole("combobox"), "gemini");

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
    expect(screen.getByText("Every:")).toBeInTheDocument();
    expect(localStorage.getItem(LS_KEYS.BACKUP_FREQUENCY)).toBe(JSON.stringify("weekly"));

    await user.click(screen.getByRole("button", { name: /countries csv/i }));
    expect(screen.getByText("No countries to export")).toBeInTheDocument();
  });

  it("calls onClose from the close button", async () => {
    const onClose = vi.fn();
    const { user } = renderSettings({ onClose });

    await user.click(screen.getByRole("button", { name: /close settings/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
