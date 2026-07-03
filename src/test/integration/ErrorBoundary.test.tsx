import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorBoundary from "../../components/shared/ErrorBoundary";

function Boom(): JSX.Element {
  throw new Error("boom");
}

function MaybeBoom({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("boom");
  return <div>Recovered content</div>;
}

describe("ErrorBoundary", () => {
  it("renders children when no error is thrown", () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Safe content")).toBeInTheDocument();
  });

  it("renders a friendly fallback when a child throws", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      render(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>,
      );

      expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
      expect(screen.getByText(/Your data is safe/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Copy Details/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "GitHub Issue" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Email/i })).toBeInTheDocument();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("resets the error state and returns to the trips route", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const { rerender } = render(
        <ErrorBoundary>
          <MaybeBoom shouldThrow />
        </ErrorBoundary>,
      );

      expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();

      rerender(
        <ErrorBoundary>
          <MaybeBoom shouldThrow={false} />
        </ErrorBoundary>,
      );

      await user.click(screen.getByRole("button", { name: "Try Again" }));

      expect(await screen.findByText("Recovered content")).toBeInTheDocument();
      expect(location.hash).toBe("#trips");
    } finally {
      consoleError.mockRestore();
    }
  });

  it("copies debug details for bug reports", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    try {
      render(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>,
      );

      await user.click(screen.getByRole("button", { name: /Copy Details/i }));

      await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
      expect(writeText.mock.calls[0][0]).toContain("Bug Report — Roamwise");
      expect(writeText.mock.calls[0][0]).toContain("Error: boom");
      expect(screen.getByRole("button", { name: /Copied/i })).toBeInTheDocument();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("opens GitHub and email reporting links with the crash details", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const open = vi.spyOn(window, "open").mockImplementation(() => null);

    try {
      render(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>,
      );

      await user.click(screen.getByRole("button", { name: "GitHub Issue" }));
      expect(open).toHaveBeenCalledWith(
        expect.stringContaining("https://github.com/piyush4793/travel-planner/issues/new"),
        "_blank",
      );
      expect(open.mock.calls[0][0]).toContain("Bug%3A%20boom");

      await user.click(screen.getByRole("button", { name: /Email/i }));
      expect(open).toHaveBeenLastCalledWith(expect.stringContaining("mailto:techiedojo4793@gmail.com"));
      expect(open.mock.calls[1][0]).toContain("Bug%3A%20boom");
    } finally {
      open.mockRestore();
      consoleError.mockRestore();
    }
  });
});
