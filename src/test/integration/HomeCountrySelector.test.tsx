import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomeCountrySelector from "../../components/shared/HomeCountrySelector";

const { isEnabledMock } = vi.hoisted(() => ({
  isEnabledMock: vi.fn(),
}));

vi.mock("../../core/featureFlags", () => ({
  isEnabled: isEnabledMock,
}));

describe("HomeCountrySelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders compact static pill when searchable selector is disabled", () => {
    isEnabledMock.mockReturnValue(false);

    render(<HomeCountrySelector value="India" onChange={vi.fn()} />);

    expect(screen.getByText("📍 India")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Search countries…")).not.toBeInTheDocument();
  });

  it("supports searchable selection flow when flag is enabled", async () => {
    isEnabledMock.mockReturnValue(true);
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<HomeCountrySelector value="India" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /India/ }));
    const input = screen.getByPlaceholderText("Search countries…");
    await user.type(input, "jap");
    await user.click(screen.getByRole("button", { name: /Japan/i }));

    expect(onChange).toHaveBeenCalledWith("Japan");
    expect(screen.queryByPlaceholderText("Search countries…")).not.toBeInTheDocument();
  });
});
