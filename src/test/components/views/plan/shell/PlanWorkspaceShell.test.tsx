import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PlanWorkspaceShell, { type RailDef } from "@/components/views/plan/shell/PlanWorkspaceShell";
import { loadLS } from "@/core/storage.ts";
import { LS_KEYS } from "@/core/lsKeys.ts";

const shape: RailDef = {
  key: "shape",
  title: "Shape your trip",
  reopenLabel: "Shape",
  mobileLabel: "✏️ Shape trip",
  node: <p>shape-content</p>,
};

const context: RailDef = {
  key: "context",
  title: "Insights",
  reopenLabel: "Insights",
  mobileLabel: "Insights",
  node: <p>context-content</p>,
};

describe("PlanWorkspaceShell (desktop)", () => {
  it("renders a Shape rail beside the context rail when provided (single-country)", () => {
    render(<PlanWorkspaceShell center={<p>itinerary</p>} shape={shape} context={context} />);
    expect(screen.getByRole("complementary", { name: "Shape your trip" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Insights" })).toBeInTheDocument();
    expect(screen.getByText("itinerary")).toBeInTheDocument();
  });

  it("omits the Shape rail entirely for the multi-country Route Canvas", () => {
    render(<PlanWorkspaceShell center={<p>route-canvas</p>} context={context} />);
    expect(screen.queryByRole("complementary", { name: "Shape your trip" })).not.toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Insights" })).toBeInTheDocument();
  });

  it("collapses a rail to a reopen tab and persists the state", () => {
    render(<PlanWorkspaceShell center={<p>itinerary</p>} shape={shape} context={context} />);
    fireEvent.click(screen.getByRole("button", { name: "Collapse Insights panel" }));
    expect(screen.queryByRole("complementary", { name: "Insights" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show Insights panel" })).toBeInTheDocument();
    expect(loadLS(LS_KEYS.PLAN_UI, { left: true, right: true }).right).toBe(false);
  });

  it("re-expands a collapsed rail when its reopen tab is clicked", () => {
    render(<PlanWorkspaceShell center={<p>itinerary</p>} shape={shape} context={context} />);
    // Collapse the left (Shape) rail, then reopen it via its tab.
    fireEvent.click(screen.getByRole("button", { name: "Collapse Shape your trip panel" }));
    const reopen = screen.getByRole("button", { name: "Show Shape panel" });
    expect(reopen).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(reopen);

    expect(screen.getByRole("complementary", { name: "Shape your trip" })).toBeInTheDocument();
    expect(loadLS(LS_KEYS.PLAN_UI, { left: true, right: true }).left).toBe(true);
  });
});
