import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DevFlagPanel from "../../components/shared/DevFlagPanel";

const { getFeatureFlagsMock, setFeatureFlagMock } = vi.hoisted(() => ({
  getFeatureFlagsMock: vi.fn(),
  setFeatureFlagMock: vi.fn(),
}));

vi.mock("../../core/featureFlags", () => ({
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
      tripGroups: false,
    });
  });

  it("opens the modal and toggles a feature flag", async () => {
    const user = userEvent.setup();
    const featureChangeListener = vi.fn();
    window.addEventListener("featureflag-change", featureChangeListener);

    render(<DevFlagPanel />);

    await user.click(screen.getByRole("button", { name: "🛠" }));
    expect(screen.getByText("🛠 Feature Flags")).toBeInTheDocument();
    expect(screen.getByText("Trip Groups")).toBeInTheDocument();

    const switches = document.querySelectorAll("button.w-11.h-6");
    expect(switches.length).toBeGreaterThan(0);
    await user.click(switches[switches.length - 1] as HTMLButtonElement);

    expect(setFeatureFlagMock).toHaveBeenCalled();
    expect(featureChangeListener).toHaveBeenCalled();

    window.removeEventListener("featureflag-change", featureChangeListener);
  });
});
