import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LifecyclePromptToast from "@/components/shared/LifecyclePromptToast.tsx";
import type { LifecyclePrompt } from "@/hooks/useLifecyclePrompts.ts";

const prompt: LifecyclePrompt = {
  id: "favorite:Norway",
  kind: "favorite",
  message: "Loved planning Norway? Save it to your favorites for quick access.",
  actionLabel: "★ Favorite",
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

    expect(screen.getByText(/Loved planning Norway/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "★ Favorite" }));
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
    expect(screen.queryByRole("button", { name: "★ Favorite" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });
});
