import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatModal from "../../components/ai/ChatModal";
import type { LLMTripPlanResult } from "../../core/utils/ai/llmTransform";
import type { ChatMessage, TokenUsage } from "../../core/types";
import type { ImportResult } from "../../utils/importParser";

const mocks = vi.hoisted(() => {
  const sendMessage = vi.fn();
  const finishChat = vi.fn();
  const clearChat = vi.fn();
  const clearError = vi.fn();
  const getLLMKeys = vi.fn();
  const getActiveProvider = vi.fn();
  const parseImportedText = vi.fn();
  const fetchChatLink = vi.fn();
  const importResultToLLM = vi.fn();

  type MockSession = {
    messages: ChatMessage[];
    loading: boolean;
    finalizing: boolean;
    error: string | null;
    finalResult: LLMTripPlanResult | null;
    finished: boolean;
    activeProviderLabel: string;
    usageWarning: string | null;
    tokenUsage: TokenUsage;
    sendMessage: typeof sendMessage;
    finishChat: typeof finishChat;
    clearChat: typeof clearChat;
    clearError: typeof clearError;
  };

  const mockSession: MockSession = {
    messages: [],
    loading: false,
    finalizing: false,
    error: null,
    finalResult: null,
    finished: false,
    activeProviderLabel: "OpenAI",
    usageWarning: null,
    tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    sendMessage,
    finishChat,
    clearChat,
    clearError,
  };

  return {
    mockSession,
    sendMessage,
    finishChat,
    clearChat,
    clearError,
    getLLMKeys,
    getActiveProvider,
    parseImportedText,
    fetchChatLink,
    importResultToLLM,
  };
});

vi.mock("../../hooks/useChatSession", () => ({
  useChatSession: () => mocks.mockSession,
}));

vi.mock("../../core/utils/ai/llmSettings", () => ({
  getLLMKeys: mocks.getLLMKeys,
  getActiveProvider: mocks.getActiveProvider,
}));

vi.mock("../../utils/importParser", async () => {
  const actual = await vi.importActual<typeof import("../../utils/importParser")>("../../utils/importParser");
  return {
    ...actual,
    parseImportedText: mocks.parseImportedText,
    fetchChatLink: mocks.fetchChatLink,
    importResultToLLM: mocks.importResultToLLM,
  };
});

const fixture: LLMTripPlanResult = {
  destinationName: "Norway",
  originCountry: "India",
  travelers: 2,
  durationDays: 3,
  budgetLevel: "mid-range",
  assumptions: [],
  cities: [{ name: "Oslo", lat: 59.9, lng: 10.7, nights: 3 }],
  meta: { bestMonths: ["June"], worstMonths: ["January"], thingsToAvoid: [], comboCountries: [], highlights: ["Fjords"] },
  plan: { duration: "3 days", costPerPerson: "₹1L", note: "", days: [{ label: "Day 1 — Oslo", activities: ["Opera House"] }] },
};

const importResult: ImportResult = {
  destinationName: "Norway",
  durationDays: 3,
  cities: ["Oslo"],
  warnings: [],
  promptSuggestions: [],
  plan: fixture.plan,
};

function renderModal(overrides: Partial<React.ComponentProps<typeof ChatModal>> = {}) {
  return render(
    <ChatModal
      open
      onClose={vi.fn()}
      homeCountry="India"
      onPlanReady={vi.fn()}
      onOpenSettings={vi.fn()}
      {...overrides}
    />,
  );
}

beforeEach(() => {
  mocks.mockSession.messages = [];
  mocks.mockSession.loading = false;
  mocks.mockSession.finalizing = false;
  mocks.mockSession.error = null;
  mocks.mockSession.finalResult = null;
  mocks.mockSession.finished = false;
  mocks.mockSession.activeProviderLabel = "OpenAI";
  mocks.mockSession.usageWarning = null;
  mocks.mockSession.tokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  mocks.sendMessage.mockReset().mockResolvedValue(undefined);
  mocks.finishChat.mockReset();
  mocks.clearChat.mockReset();
  mocks.clearError.mockReset();
  mocks.getLLMKeys.mockReset().mockReturnValue({ openai: "test-key" });
  mocks.getActiveProvider.mockReset().mockReturnValue("openai");
  mocks.parseImportedText.mockReset().mockReturnValue(importResult);
  mocks.fetchChatLink.mockReset().mockResolvedValue({ text: "Day 1 — Oslo" });
  mocks.importResultToLLM.mockReset().mockReturnValue(fixture);
});

describe("ChatModal", () => {
  it("renders nothing when closed and renders the chat UI when open", () => {
    const { rerender } = render(
      <ChatModal open={false} onClose={vi.fn()} homeCountry="India" onPlanReady={vi.fn()} onOpenSettings={vi.fn()} />,
    );

    expect(screen.queryByRole("dialog", { name: /AI Trip Planner/i })).not.toBeInTheDocument();

    rerender(<ChatModal open onClose={vi.fn()} homeCountry="India" onPlanReady={vi.fn()} onOpenSettings={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: /AI Trip Planner/i })).toBeInTheDocument();
    expect(screen.getByText(/Powered by OpenAI/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe your trip/i)).toBeInTheDocument();
  });

  it("prompts for settings when no provider key is configured", async () => {
    const user = userEvent.setup({ delay: null });
    const onClose = vi.fn();
    const onOpenSettings = vi.fn();
    mocks.getLLMKeys.mockReturnValue({});

    renderModal({ onClose, onOpenSettings });

    await user.click(screen.getByRole("button", { name: /Setup API key/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("sends typed text when the user submits a message", async () => {
    const user = userEvent.setup({ delay: null });
    renderModal({ initialPrompt: "Plan Norway", autoSend: false });

    const input = screen.getByPlaceholderText(/Describe your trip/i);
    expect(input).toHaveValue("Plan Norway");
    await user.click(screen.getByRole("button", { name: /^Send$/i }));

    expect(mocks.sendMessage).toHaveBeenCalledWith("Plan Norway");
  });

  it("disables sending while loading", () => {
    mocks.mockSession.loading = true;

    renderModal();

    expect(screen.getByRole("button", { name: /^Send$/i })).toBeDisabled();
  });

  it("renders user and assistant messages", () => {
    mocks.mockSession.messages = [
      { role: "user", content: "I want fjords" },
      { role: "assistant", content: "Norway is a great fit" },
    ];

    renderModal();

    expect(screen.getByText("I want fjords")).toBeInTheDocument();
    expect(screen.getByText("Norway is a great fit")).toBeInTheDocument();
  });

  it("shows a scroll-to-latest button when the message list is scrolled up", () => {
    mocks.mockSession.messages = [
      { role: "user", content: "I want fjords" },
      { role: "assistant", content: "Norway is a great fit" },
    ];

    renderModal();

    expect(screen.queryByRole("button", { name: /scroll to latest/i })).toBeNull();

    const container = screen.getByText("I want fjords").closest(".overflow-y-auto") as HTMLElement;
    Object.defineProperty(container, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 300, configurable: true });
    Object.defineProperty(container, "scrollTop", { value: 100, configurable: true, writable: true });
    fireEvent.scroll(container);

    expect(screen.getByRole("button", { name: /scroll to latest/i })).toBeInTheDocument();
  });

  it("shows and dismisses errors", async () => {
    const user = userEvent.setup({ delay: null });
    mocks.mockSession.error = "Something went wrong";

    renderModal();

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Dismiss/i }));

    expect(mocks.clearError).toHaveBeenCalledTimes(1);
  });

  it("runs finishChat from the finish button and opens a finished itinerary", async () => {
    const user = userEvent.setup({ delay: null });
    const onPlanReady = vi.fn();
    mocks.mockSession.messages = [{ role: "user", content: "Plan Norway" }];
    mocks.mockSession.tokenUsage = { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 };

    const { rerender } = renderModal({ onPlanReady });

    await user.click(screen.getByRole("button", { name: /Finish and generate/i }));
    expect(mocks.finishChat).toHaveBeenCalledTimes(1);

    mocks.mockSession.messages = [];
    mocks.mockSession.finished = true;
    mocks.mockSession.finalResult = fixture;
    rerender(
      <ChatModal open onClose={vi.fn()} homeCountry="India" onPlanReady={onPlanReady} onOpenSettings={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: /View Itinerary/i }));
    expect(onPlanReady).toHaveBeenCalledWith(fixture);
  });

  it("renders token usage and usage warnings", () => {
    mocks.mockSession.tokenUsage = { inputTokens: 1200, outputTokens: 800, totalTokens: 2000 };
    mocks.mockSession.usageWarning = "4 messages remaining in this session";

    renderModal();

    expect(screen.getByLabelText(/Token usage: ~2.0K tokens/i)).toBeInTheDocument();
    expect(screen.getByText("4 messages remaining in this session")).toBeInTheDocument();
  });

  it("imports pasted AI text and saves the converted plan", async () => {
    const user = userEvent.setup({ delay: null });
    const onSaveImportedPlan = vi.fn();

    renderModal({ onSaveImportedPlan });

    await user.click(screen.getByRole("button", { name: /Paste/i }));
    await user.type(screen.getByPlaceholderText(/Paste conversation here/i), "Day 1 — Oslo: Opera House");
    await user.click(screen.getByRole("button", { name: /Parse Conversation/i }));
    await user.click(screen.getByRole("button", { name: /Review & Save/i }));

    expect(mocks.parseImportedText).toHaveBeenCalledWith("Day 1 — Oslo: Opera House");
    expect(mocks.importResultToLLM).toHaveBeenCalledWith(importResult, "India");
    expect(onSaveImportedPlan).toHaveBeenCalledWith(fixture);
    expect(screen.getByText(/Plan saved/i)).toBeInTheDocument();
  });

  it("confirms before closing an in-progress chat", async () => {
    const user = userEvent.setup({ delay: null });
    const onClose = vi.fn();
    mocks.mockSession.messages = [{ role: "user", content: "Plan Norway" }];

    renderModal({ onClose });

    await user.click(screen.getByRole("button", { name: /Close chat/i }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Close$/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mocks.clearChat).toHaveBeenCalledTimes(1);
  });
});
