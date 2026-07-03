import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModalShell from "../../components/shared/ModalShell";

describe("ModalShell", () => {
  it("renders nothing when closed", () => {
    render(
      <ModalShell open={false} onClose={vi.fn()} label="Settings">
        <button>Inside modal</button>
      </ModalShell>,
    );

    expect(screen.queryByRole("dialog", { name: "Settings" })).not.toBeInTheDocument();
  });

  it("calls onClose on Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ModalShell open onClose={onClose} label="Settings">
        <button>Inside modal</button>
      </ModalShell>,
    );

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on backdrop click but not on dialog content click", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ModalShell open onClose={onClose} label="Settings">
        <button>Inside modal</button>
      </ModalShell>,
    );

    await user.click(screen.getByRole("button", { name: "Inside modal" }));
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole("dialog", { name: "Settings" }).parentElement!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("honors preventClose for Escape and backdrop clicks", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ModalShell open preventClose onClose={onClose} label="Locked">
        <button>Inside modal</button>
      </ModalShell>,
    );

    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("dialog", { name: "Locked" }).parentElement!);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("traps Tab focus between focusable elements", async () => {
    render(
      <ModalShell open onClose={vi.fn()} label="Wizard">
        <button>First</button>
        <button>Last</button>
      </ModalShell>,
    );

    const first = await screen.findByRole("button", { name: "First" });
    const last = screen.getByRole("button", { name: "Last" });

    // Drive the trap handler deterministically via keydown on the current
    // activeElement (userEvent.tab races with the component's own focus moves).
    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(first).toHaveFocus();

    first.focus();
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });

  it("closes on device Back (popstate) when on a mobile viewport", () => {
    const prevMatchMedia = window.matchMedia;
    // Force the mobile breakpoint: no min-width query matches.
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;

    const onClose = vi.fn();
    const { unmount } = render(
      <ModalShell open onClose={onClose} label="Settings">
        <button>Inside modal</button>
      </ModalShell>,
    );

    fireEvent.popState(window);
    expect(onClose).toHaveBeenCalledTimes(1);

    unmount();
    window.matchMedia = prevMatchMedia;
  });
});
