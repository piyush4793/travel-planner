import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import HoverCard from "@/components/map/HoverCard.tsx";
import type { Country } from "@/core/types.ts";

const mocks = vi.hoisted(() => ({ getWikiImage: vi.fn() }));

vi.mock("@/utils/wikiImages.ts", () => ({
  getWikiImage: mocks.getWikiImage,
}));

function makeCountry(over: Partial<Country> = {}): Country {
  return {
    name: "Japan",
    lat: 35,
    lng: 139,
    bestMonths: ["March", "April"],
    budget: "₹1.5L",
    experiences: ["Food"],
    ...over,
  };
}

describe("HoverCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getWikiImage.mockResolvedValue(null);
  });

  it("renders as a tooltip with an accessible label, name, and budget", () => {
    render(<HoverCard country={makeCountry()} x={100} y={200} />);
    const card = screen.getByRole("tooltip");
    expect(card).toHaveAttribute("aria-label", expect.stringContaining("Japan"));
    expect(card).toHaveAttribute("aria-label", expect.stringContaining("₹1.5L"));
    // Name + budget both surface visually.
    expect(screen.getByText("Japan")).toBeInTheDocument();
    expect(screen.getByText("₹1.5L")).toBeInTheDocument();
  });

  it("positions itself at the supplied x/y coordinates", () => {
    render(<HoverCard country={makeCountry()} x={120} y={240} />);
    const card = screen.getByRole("tooltip");
    expect(card).toHaveStyle({ left: "120px", top: "240px" });
  });

  it("shows the initial-letter fallback while no image has resolved", () => {
    render(<HoverCard country={makeCountry({ name: "Norway" })} x={0} y={0} />);
    expect(screen.getByText("N")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders the fetched Wikimedia image once it resolves", async () => {
    mocks.getWikiImage.mockResolvedValue("https://example.test/japan.jpg");
    render(<HoverCard country={makeCountry()} x={0} y={0} />);
    const img = await screen.findByRole("img", { name: "Japan" });
    expect(img).toHaveAttribute("src", "https://example.test/japan.jpg");
  });

  it("prefers the country's landmark over its name for the image lookup", async () => {
    mocks.getWikiImage.mockResolvedValue(null);
    render(<HoverCard country={makeCountry({ landmark: "Mount Fuji" })} x={0} y={0} />);
    await waitFor(() => expect(mocks.getWikiImage).toHaveBeenCalledWith("Mount Fuji"));
  });

  it("falls back to the initial letter when the image fails to load", async () => {
    mocks.getWikiImage.mockResolvedValue("https://example.test/broken.jpg");
    render(<HoverCard country={makeCountry({ name: "France" })} x={0} y={0} />);
    const img = await screen.findByRole("img", { name: "France" });
    fireEvent.error(img);
    await waitFor(() => expect(screen.queryByRole("img")).not.toBeInTheDocument());
    expect(screen.getByText("F")).toBeInTheDocument();
  });

  it("re-fetches and resets the image when the country prop changes", async () => {
    mocks.getWikiImage.mockResolvedValueOnce("https://example.test/japan.jpg");
    const { rerender } = render(<HoverCard country={makeCountry()} x={0} y={0} />);
    await screen.findByRole("img", { name: "Japan" });

    mocks.getWikiImage.mockResolvedValueOnce(null);
    rerender(<HoverCard country={makeCountry({ name: "Italy", landmark: "Colosseum" })} x={0} y={0} />);
    // Image resets immediately to the fallback for the new country.
    await waitFor(() => expect(mocks.getWikiImage).toHaveBeenCalledWith("Colosseum"));
    expect(await screen.findByText("I")).toBeInTheDocument();
  });
});
