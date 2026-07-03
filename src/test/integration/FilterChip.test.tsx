import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilterChip from "../../components/shared/FilterChip";

function renderChip(onPick = vi.fn()) {
  render(
    <FilterChip label="Budget" active={false}>
      {(close) => (
        <div role="menu" aria-label="Budget choices">
          <button onClick={() => { onPick("budget"); close(); }}>Budget option</button>
          <button onClick={() => onPick("premium")}>Premium option</button>
        </div>
      )}
    </FilterChip>,
  );
  return onPick;
}

describe("FilterChip", () => {
  it("opens a portal panel and toggles aria-expanded", async () => {
    const user = userEvent.setup();
    renderChip();

    const trigger = screen.getByRole("button", { name: /Budget/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu", { name: "Budget choices" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Budget option" })).toHaveFocus());
  });

  it("selects an option, fires the callback, and closes when the child closes it", async () => {
    const user = userEvent.setup();
    const onPick = renderChip();

    await user.click(screen.getByRole("button", { name: /Budget/i }));
    await user.click(screen.getByRole("button", { name: "Budget option" }));

    expect(onPick).toHaveBeenCalledWith("budget");
    expect(screen.getByRole("button", { name: /Budget/i })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu", { name: "Budget choices" })).not.toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    renderChip();

    const trigger = screen.getByRole("button", { name: /Budget/i });
    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("closes on outside mouse down", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <FilterChip label="Month" active>
          {() => <button>Jan</button>}
        </FilterChip>
        <button>Outside</button>
      </div>,
    );

    await user.click(screen.getByRole("button", { name: /Month/i }));
    expect(screen.getByRole("button", { name: "Jan" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Outside" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "Jan" })).not.toBeInTheDocument());
  });

  it("keeps the portal inside the viewport when opened near the right edge", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 500 });
    renderChip();

    const trigger = screen.getByRole("button", { name: /Budget/i });
    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
      x: 480,
      y: 20,
      width: 40,
      height: 20,
      top: 20,
      right: 520,
      bottom: 40,
      left: 480,
      toJSON: () => ({}),
    });

    await user.click(trigger);

    const panel = screen.getByRole("menu", { name: "Budget choices" }).parentElement;
    expect(panel).toHaveStyle({ left: "248px", top: "46px", position: "fixed" });
  });
});
