import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BorderHop from "@/components/views/plan/review/BorderHop";

describe("BorderHop", () => {
  it("renders a collapsed honest travel row by default", () => {
    render(<BorderHop fromName="Norway" toName="Denmark" />);
    expect(screen.getByText("Travel from Norway to Denmark")).toBeInTheDocument();
    expect(screen.queryByText("Search flights")).not.toBeInTheDocument();
  });

  it("expands into live-search links on click and is a11y-wired", () => {
    render(<BorderHop fromName="Norway" toName="Denmark" />);
    const trigger = screen.getByRole("button", { name: /Travel from Norway to Denmark/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    const flights = screen.getByRole("link", { name: /Search flights/ });
    const routes = screen.getByRole("link", { name: /Compare all routes/ });
    const directions = screen.getByRole("link", { name: /Directions/ });

    // Deep links carry the from→to pair and open safely in a new tab.
    expect(flights).toHaveAttribute("href", expect.stringContaining("flights%20from%20Norway%20to%20Denmark"));
    expect(routes).toHaveAttribute("href", "https://www.rome2rio.com/map/Norway/Denmark");
    expect(directions).toHaveAttribute("href", expect.stringContaining("origin=Norway&destination=Denmark"));
    for (const a of [flights, routes, directions]) {
      expect(a).toHaveAttribute("target", "_blank");
      expect(a).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("prefills the search links city-to-city, qualified by country", () => {
    render(<BorderHop fromName="Norway" toName="Denmark" fromCity="Bergen" toCity="Copenhagen" />);
    expect(screen.getByText(/Bergen → Copenhagen/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Travel from Norway to Denmark/ }));

    const flights = screen.getByRole("link", { name: /Search flights/ });
    const routes = screen.getByRole("link", { name: /Compare all routes/ });
    const directions = screen.getByRole("link", { name: /Directions/ });
    expect(flights).toHaveAttribute(
      "href",
      expect.stringContaining("flights%20from%20Bergen%2C%20Norway%20to%20Copenhagen%2C%20Denmark"),
    );
    expect(routes).toHaveAttribute("href", "https://www.rome2rio.com/map/Bergen%2C%20Norway/Copenhagen%2C%20Denmark");
    expect(directions).toHaveAttribute(
      "href",
      expect.stringContaining("origin=Bergen%2C%20Norway&destination=Copenhagen%2C%20Denmark"),
    );
  });

  it("shows a factual great-circle distance when coords are known", () => {
    render(
      <BorderHop
        fromName="Norway"
        toName="Denmark"
        fromPoint={{ lat: 60, lng: 10 }}
        toPoint={{ lat: 55, lng: 12 }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Travel from Norway to Denmark/ }));
    expect(screen.getByText(/km apart/)).toBeInTheDocument();
  });

  it("omits the distance line when coords are missing, never faking transit data", () => {
    render(<BorderHop fromName="Norway" toName="Denmark" />);
    fireEvent.click(screen.getByRole("button", { name: /Travel from Norway to Denmark/ }));
    expect(screen.getByRole("link", { name: /Search flights/ })).toBeInTheDocument();
    expect(screen.queryByText(/km apart/)).not.toBeInTheDocument();
  });
});
