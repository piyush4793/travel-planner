import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { setupUser } from "@/test/testUtils.ts";
import { LearnAboutSection, PlanningResourcesSection, UsefulLinksSection } from "@/components/country/panel/InfoSections.tsx";
import CityCard from "@/components/country/panel/CityCard.tsx";
import type { CityEntry } from "@/core/types.ts";

const mocks = vi.hoisted(() => ({
  fetchCountryInfo: vi.fn(),
  getPlanningLinks: vi.fn(),
  isEnabled: vi.fn(),
  exportItineraryAsPdf: vi.fn(),
}));

vi.mock("@/utils/countryInfo.ts", () => ({
  fetchCountryInfo: mocks.fetchCountryInfo,
}));

vi.mock("@/utils/planningLinks.ts", () => ({
  getPlanningLinks: mocks.getPlanningLinks,
}));

vi.mock("@/core/featureFlags.ts", () => ({
  isEnabled: mocks.isEnabled,
}));

vi.mock("@/utils/pdfExport.ts", () => ({
  exportItineraryAsPdf: mocks.exportItineraryAsPdf,
}));

describe("InfoSections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPlanningLinks.mockReturnValue([
      { label: "Official tourism", url: "https://example.test/tourism", emoji: "🏛️", description: "Entry rules and highlights" },
      { label: "Transit guide", url: "https://example.test/transit", emoji: "🚆", description: "Rail passes and routes" },
    ]);
  });

  it("loads country info only when expanded and renders fetched details", async () => {
    const user = setupUser();
    mocks.fetchCountryInfo.mockResolvedValue({
      capital: "Tokyo",
      currency: "Japanese yen",
      language: "Japanese",
      summary: "Japan blends food, nature, and culture.",
      thumbnail: "https://example.test/japan.jpg",
    });
    const currentCountryNameRef = { current: "Japan" };

    render(<LearnAboutSection countryName="Japan" currentCountryNameRef={currentCountryNameRef} />);

    const toggle = screen.getByRole("button", { name: /Learn about Japan/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(mocks.fetchCountryInfo).not.toHaveBeenCalled();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    // Async region is an assertive-free live region so SR users hear load/error/content updates.
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
    expect(mocks.fetchCountryInfo).toHaveBeenCalledWith("Japan");
    expect(await screen.findByText("Japan blends food, nature, and culture.")).toBeInTheDocument();
    expect(screen.getByText(/Tokyo/)).toBeInTheDocument();
    expect(screen.getByText(/Japanese yen/)).toBeInTheDocument();
    expect(screen.getByText(/^🗣️\s*Japanese$/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Japan" })).toHaveAttribute("src", "https://example.test/japan.jpg");
    expect(screen.getByRole("link", { name: /Read more on Wikipedia/i })).toHaveAttribute("href", expect.stringContaining("Japan"));
  });

  it("shows retry after a failed info lookup and reloads successfully", async () => {
    const user = setupUser();
    mocks.fetchCountryInfo
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ summary: "Recovered country summary." });
    const currentCountryNameRef = { current: "Japan" };

    render(<LearnAboutSection countryName="Japan" currentCountryNameRef={currentCountryNameRef} />);

    await user.click(screen.getByRole("button", { name: /Learn about Japan/i }));
    expect(await screen.findByText("Failed to load info")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Retry/i }));

    expect(await screen.findByText("Recovered country summary.")).toBeInTheDocument();
    expect(mocks.fetchCountryInfo).toHaveBeenCalledTimes(2);
  });

  it("ignores stale country info when the selected country changes before fetch resolves", async () => {
    const user = setupUser();
    mocks.fetchCountryInfo.mockResolvedValue({ summary: "Stale Japan summary." });
    const currentCountryNameRef = { current: "France" };

    render(<LearnAboutSection countryName="Japan" currentCountryNameRef={currentCountryNameRef} />);

    await user.click(screen.getByRole("button", { name: /Learn about Japan/i }));

    await waitFor(() => expect(mocks.fetchCountryInfo).toHaveBeenCalledWith("Japan"));
    expect(screen.queryByText("Stale Japan summary.")).not.toBeInTheDocument();
  });

  it("renders planning resources from the link provider and toggles the section", async () => {
    const user = setupUser();

    render(<PlanningResourcesSection countryName="Japan" homeCountry="India" />);

    expect(mocks.getPlanningLinks).toHaveBeenCalledWith("Japan", "India");
    const toggle = screen.getByRole("button", { name: /Planning resources/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: /Official tourism/i })).toHaveAttribute("href", "https://example.test/tourism");
    expect(screen.getByText("Entry rules and highlights")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Transit guide/i })).toHaveAttribute("href", "https://example.test/transit");
  });

  it("renders nothing when there are no useful links", () => {
    const { container } = render(<UsefulLinksSection links={[]} />);
    expect(container).toBeEmptyDOMElement();
    render(<UsefulLinksSection />);
    expect(screen.queryByRole("button", { name: /Useful links/i })).not.toBeInTheDocument();
  });

  it("renders curated useful links as external, safe anchors when expanded", async () => {
    const user = setupUser();
    render(<UsefulLinksSection links={[{ label: "Japan Rail Pass", url: "https://example.test/jr" }]} />);

    const toggle = screen.getByRole("button", { name: /Useful links/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);

    const link = screen.getByRole("link", { name: /Japan Rail Pass/i });
    expect(link).toHaveAttribute("href", "https://example.test/jr");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});

describe("CityCard", () => {
  const city: CityEntry = {
    name: "Kyoto",
    lat: 35.0116,
    lng: 135.7681,
    bestMonths: ["March", "April", "May", "November"],
    notes: "Temples, gardens, and calm evening streets.",
  };

  it("renders a read-only city summary with notes and the first three month badges", () => {
    render(<CityCard city={city} />);

    expect(screen.getByText("Kyoto")).toBeInTheDocument();
    expect(screen.getByText("Temples, gardens, and calm evening streets.")).toBeInTheDocument();
    expect(screen.getByText("Mar")).toBeInTheDocument();
    expect(screen.getByText("Apr")).toBeInTheDocument();
    expect(screen.getByText("May")).toBeInTheDocument();
    expect(screen.queryByText("Nov")).not.toBeInTheDocument();
  });

  it("renders without optional notes or month badges", () => {
    const { container } = render(<CityCard city={{ name: "Osaka", lat: 34.6937, lng: 135.5023 }} />);

    expect(screen.getByText("Osaka")).toBeInTheDocument();
    expect(container).not.toHaveTextContent("✓");
    expect(container).not.toHaveTextContent("Mar");
  });

  it("acts as a selectable pressed button and calls onToggle", async () => {
    const user = setupUser();
    const onToggle = vi.fn();

    render(<CityCard city={city} selectable selected onToggle={onToggle} />);

    const button = screen.getByRole("button", { name: /Kyoto/i });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("✓")).toBeInTheDocument();

    await user.click(button);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("renders an unselected selectable card with notes and month badges", () => {
    render(<CityCard city={city} selectable selected={false} onToggle={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Kyoto/i })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Temples, gardens, and calm evening streets.")).toBeInTheDocument();
    expect(screen.getByText("Mar")).toBeInTheDocument();
    expect(screen.getByText("Apr")).toBeInTheDocument();
    expect(screen.getByText("May")).toBeInTheDocument();
    expect(screen.queryByText("Nov")).not.toBeInTheDocument();
  });

  it("shows experience chips and flags a card matching the active focus", () => {
    const tagged: CityEntry = { ...city, experiences: ["Temples", "Food"] };
    render(
      <CityCard city={tagged} selectable selected={false} onToggle={vi.fn()} activeExperiences={["Temples"]} />,
    );

    expect(screen.getByText("Temples")).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Kyoto — matches your focus experiences/i }),
    ).toBeInTheDocument();
  });

  it("does not flag a match when no experiences intersect the focus", () => {
    const tagged: CityEntry = { ...city, experiences: ["Food"] };
    render(
      <CityCard city={tagged} selectable selected={false} onToggle={vi.fn()} activeExperiences={["Temples"]} />,
    );

    expect(
      screen.queryByRole("button", { name: /matches your focus experiences/i }),
    ).not.toBeInTheDocument();
  });

  it("renders worst-month avoid badges in the read-only card", () => {
    const withWorst: CityEntry = { ...city, worstMonths: ["June", "July", "August", "September"] };
    render(<CityCard city={withWorst} />);

    expect(screen.getByLabelText("Best avoided in June")).toBeInTheDocument();
    expect(screen.getByLabelText("Best avoided in July")).toBeInTheDocument();
    expect(screen.getByLabelText("Best avoided in August")).toBeInTheDocument();
    expect(screen.queryByLabelText("Best avoided in September")).not.toBeInTheDocument();
  });

  it("renders worst-month avoid badges in the selectable card", () => {
    const withWorst: CityEntry = { ...city, worstMonths: ["June"] };
    render(<CityCard city={withWorst} selectable selected={false} onToggle={vi.fn()} />);

    expect(screen.getByLabelText("Best avoided in June")).toBeInTheDocument();
  });

  it("omits worst-month badges when none are present", () => {
    render(<CityCard city={city} />);

    expect(screen.queryByLabelText(/Best avoided/i)).not.toBeInTheDocument();
  });

  it("applies emerald selection styling with best+worst months on one row", () => {
    const withWorst: CityEntry = { ...city, worstMonths: ["June"], experiences: ["Temples"] };
    render(
      <CityCard city={withWorst} selectable selected onToggle={vi.fn()} activeExperiences={["Temples"]} />,
    );

    const button = screen.getByRole("button", { name: /Kyoto — matches your focus experiences/i });
    expect(button.className).toContain("bg-brand-50");
    expect(button.className).toContain("border-brand-500");
    expect(button.className).toContain("focus-ring-emerald");
    expect(screen.getByText("Mar")).toBeInTheDocument();
    expect(screen.getByLabelText("Best avoided in June")).toBeInTheDocument();
  });
});
