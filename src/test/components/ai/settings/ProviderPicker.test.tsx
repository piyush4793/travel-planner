import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProviderPicker from "@/components/ai/settings/ProviderPicker.tsx";

describe("ProviderPicker", () => {
  it("renders a radiogroup, marks the active provider, and flags connected keys", () => {
    const onChange = vi.fn();
    render(
      <ProviderPicker value="openai" onChange={onChange} connected={{ claude: "sk-test" }} />,
    );

    expect(screen.getByRole("radiogroup", { name: /ai provider/i })).toBeInTheDocument();
    // The connected provider's accessible name reflects its state.
    expect(screen.getByRole("radio", { name: /claude \(connected\)/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /gemini/i }));
    expect(onChange).toHaveBeenCalledWith("gemini");
  });

  it("navigates providers with Arrow keys (wrapping) and ignores other keys", () => {
    const onChange = vi.fn();
    render(<ProviderPicker value="openai" onChange={onChange} connected={{}} />);
    const first = screen.getByRole("radio", { name: /openai/i });

    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("claude");

    fireEvent.keyDown(first, { key: "ArrowUp" });
    expect(onChange).toHaveBeenLastCalledWith("gemini");

    onChange.mockClear();
    fireEvent.keyDown(first, { key: "Tab" });
    expect(onChange).not.toHaveBeenCalled();
  });
});
