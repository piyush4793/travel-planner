import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LifecyclePromptToast from "@/components/shared/LifecyclePromptToast.tsx";
import type { LifecyclePrompt } from "@/hooks/useLifecyclePrompts.ts";

const prompt: LifecyclePrompt = {
  id: "backup",
  kind: "backup",
  message: "You've made a few changes since your last backup. Keep them safe?",
  actionLabel: "Back up now",
  onAction: () => {},
};

describe("LifecyclePromptToast", () => {
  it("renders nothing when there is no prompt", () => {
    const { container } = render(
      <LifecyclePromptToast prompt={null} onAct={() => {}} onDismiss={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the message and action, and wires the callbacks", () => {
    const onAct = vi.fn();
    const onDismiss = vi.fn();
    render(<LifecyclePromptToast prompt={prompt} onAct={onAct} onDismiss={onDismiss} />);

    expect(screen.getByText(/changes since your last backup/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back up now" }));
    expect(onAct).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("omits the action button when the prompt has no actionLabel", () => {
    render(
      <LifecyclePromptToast
        prompt={{ ...prompt, actionLabel: undefined, onAction: undefined }}
        onAct={() => {}}
        onDismiss={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: "Back up now" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });
});
