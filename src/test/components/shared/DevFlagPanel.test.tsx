import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DevFlagPanel from "@/components/shared/DevFlagPanel.tsx";

const { getFeatureFlagsMock, setFeatureFlagMock } = vi.hoisted(() => ({
  getFeatureFlagsMock: vi.fn(),
  setFeatureFlagMock: vi.fn(),
}));

vi.mock("@/core/featureFlags.ts", () => ({
  getFeatureFlags: getFeatureFlagsMock,
  setFeatureFlag: setFeatureFlagMock,
  PAID_FLAGS: new Set(["llmPlanning", "pdfExport"]),
}));

describe("DevFlagPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFeatureFlagsMock.mockReturnValue({
      paidFeatures: true,
      llmPlanning: true,
      pdfExport: true,
      searchableHomeCountry: false,
      multiCountryPlanning: true,
    });
  });

  it("opens the modal and toggles a feature flag", async () => {
    const user = userEvent.setup();
    const featureChangeListener = vi.fn();
    window.addEventListener("featureflag-change", featureChangeListener);

    render(<DevFlagPanel />);

    await user.click(screen.getByRole("button", { name: "Dev: Feature Flags" }));
    expect(screen.getByText("🛠 Feature Flags")).toBeInTheDocument();
    expect(screen.getByText("Multi-Country Planning")).toBeInTheDocument();

    const switches = screen.getAllByRole("switch");
    expect(switches.length).toBeGreaterThan(0);
    await user.click(switches[switches.length - 1]);

    expect(setFeatureFlagMock).toHaveBeenCalled();
    expect(featureChangeListener).toHaveBeenCalled();

    window.removeEventListener("featureflag-change", featureChangeListener);
  });
});
