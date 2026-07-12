import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CinematicHeader from "@/components/country/cinematic/CinematicHeader.tsx";
import type { CityStop } from "@/components/country/cinematic/engine.ts";

const stops: CityStop[] = [
  { name: "Tokyo", coords: [0, 0], days: [], transportToNext: { type: "train", label: "to Kyoto" } },
  { name: "Kyoto", coords: [0, 0], days: [] },
];

afterEach(cleanup);

describe("CinematicHeader", () => {
  it("renders the title, duration and a trail node per stop", () => {
    render(
      <CinematicHeader title="Japan" duration="8 days" isMobile={false} homeCity="" showOrigin={false} stops={stops} activeCityIdx={0} onClose={() => {}} />,
    );
    expect(screen.getByRole("heading", { name: "Japan" })).toBeInTheDocument();
    expect(screen.getByText("8 days")).toBeInTheDocument();
    expect(screen.getByTitle("Tokyo")).toBeInTheDocument();
    expect(screen.getByTitle("Kyoto")).toBeInTheDocument();
  });

  it("brackets the trail with the home city when an origin frames the route", () => {
    render(
      <CinematicHeader title="Japan" duration="8 days" isMobile={false} homeCity="Mumbai" showOrigin stops={stops} activeCityIdx={0} onClose={() => {}} />,
    );
    expect(screen.getAllByText("Mumbai")).toHaveLength(2);
  });

  it("fires onClose", async () => {
    const onClose = vi.fn();
    render(
      <CinematicHeader title="Japan" duration="8 days" isMobile={false} homeCity="" showOrigin={false} stops={stops} activeCityIdx={0} onClose={onClose} />,
    );
    await userEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
