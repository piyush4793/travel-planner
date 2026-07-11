import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PlanWorkspaceShell, { type RailDef } from "../components/views/plan/PlanWorkspaceShell";
import { loadLS } from "../core/storage";
import { LS_KEYS } from "../core/lsKeys";

const shape: RailDef = {
  key: "shape",
  title: "Shape your trip",
  reopenLabel: "Shape",
  mobileLabel: "✏️ Shape trip",
  node: <p>shape-content</p>,
};

const context: RailDef = {
  key: "context",
  title: "Good to know",
  reopenLabel: "Details",
  mobileLabel: "📌 Good to know",
  node: <p>context-content</p>,
};

describe("PlanWorkspaceShell (desktop)", () => {
  it("renders a Shape rail beside the context rail when provided (single-country)", () => {
    render(<PlanWorkspaceShell center={<p>itinerary</p>} shape={shape} context={context} />);
    expect(screen.getByRole("complementary", { name: "Shape your trip" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Good to know" })).toBeInTheDocument();
    expect(screen.getByText("itinerary")).toBeInTheDocument();
  });

  it("omits the Shape rail entirely for the multi-country Route Canvas", () => {
    render(<PlanWorkspaceShell center={<p>route-canvas</p>} context={context} />);
    expect(screen.queryByRole("complementary", { name: "Shape your trip" })).not.toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Good to know" })).toBeInTheDocument();
  });

  it("collapses a rail to a reopen tab and persists the state", () => {
    render(<PlanWorkspaceShell center={<p>itinerary</p>} shape={shape} context={context} />);
    fireEvent.click(screen.getByRole("button", { name: "Collapse Good to know panel" }));
    expect(screen.queryByRole("complementary", { name: "Good to know" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show Details panel" })).toBeInTheDocument();
    expect(loadLS(LS_KEYS.PLAN_UI, { left: true, right: true }).right).toBe(false);
  });
});
