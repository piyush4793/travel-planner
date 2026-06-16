import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { useConfirm } from "../../components/shared/ConfirmDialog";

function TestHarness({ onResult }: { onResult: (v: boolean) => void }) {
  const [confirm, ConfirmDialog] = useConfirm();

  return (
    <>
      <button onClick={async () => onResult(await confirm({ message: "Delete this?" }))}>
        trigger-default
      </button>
      <button
        onClick={async () =>
          onResult(
            await confirm({
              title: "Custom Title",
              message: "Are you sure?",
              confirmLabel: "Yes, do it",
              cancelLabel: "No thanks",
              variant: "warning",
            }),
          )
        }
      >
        trigger-custom
      </button>
      <ConfirmDialog />
    </>
  );
}

describe("ConfirmDialog", () => {
  it("resolves true when confirm is clicked", async () => {
    let result: boolean | null = null;
    render(<TestHarness onResult={(v) => (result = v)} />);

    fireEvent.click(screen.getByText("trigger-default"));

    await waitFor(() => {
      expect(screen.getByText("Delete this?")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Confirm"));
    await waitFor(() => expect(result).toBe(true));
  });

  it("resolves false when cancel is clicked", async () => {
    let result: boolean | null = null;
    render(<TestHarness onResult={(v) => (result = v)} />);

    fireEvent.click(screen.getByText("trigger-default"));

    await waitFor(() => {
      expect(screen.getByText("Delete this?")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() => expect(result).toBe(false));
  });

  it("resolves false on Escape key", async () => {
    let result: boolean | null = null;
    render(<TestHarness onResult={(v) => (result = v)} />);

    fireEvent.click(screen.getByText("trigger-default"));

    await waitFor(() => {
      expect(screen.getByText("Delete this?")).toBeTruthy();
    });

    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    await waitFor(() => expect(result).toBe(false));
  });

  it("shows custom title, message, and button labels", async () => {
    let result: boolean | null = null;
    render(<TestHarness onResult={(v) => (result = v)} />);

    fireEvent.click(screen.getByText("trigger-custom"));

    await waitFor(() => {
      expect(screen.getByText("Custom Title")).toBeTruthy();
      expect(screen.getByText("Are you sure?")).toBeTruthy();
      expect(screen.getByText("Yes, do it")).toBeTruthy();
      expect(screen.getByText("No thanks")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Yes, do it"));
    await waitFor(() => expect(result).toBe(true));
  });

  it("uses default title when not provided", async () => {
    let result: boolean | null = null;
    render(<TestHarness onResult={(v) => (result = v)} />);

    fireEvent.click(screen.getByText("trigger-default"));

    await waitFor(() => {
      expect(screen.getByText("Are you sure?")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() => expect(result).toBe(false));
  });

  it("resolves false on backdrop click", async () => {
    let result: boolean | null = null;
    render(<TestHarness onResult={(v) => (result = v)} />);

    fireEvent.click(screen.getByText("trigger-default"));

    await waitFor(() => {
      expect(screen.getByText("Delete this?")).toBeTruthy();
    });

    // Click the backdrop (the fixed overlay parent of the dialog)
    const dialog = screen.getByRole("alertdialog");
    const backdrop = dialog.parentElement!;
    fireEvent.click(backdrop);
    await waitFor(() => expect(result).toBe(false));
  });
});

describe("useConfirm hook", () => {
  it("returns a confirm function and a Dialog component", () => {
    const { result } = renderHook(() => useConfirm());
    const [confirm, Dialog] = result.current;

    expect(typeof confirm).toBe("function");
    expect(typeof Dialog).toBe("function");
  });
});
