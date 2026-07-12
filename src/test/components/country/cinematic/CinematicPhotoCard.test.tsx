import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CinematicPhotoCard from "@/components/country/cinematic/CinematicPhotoCard.tsx";

const photos = ["https://img/a.jpg", "https://img/b.jpg"];

afterEach(cleanup);

describe("CinematicPhotoCard", () => {
  it("renders one img per photo plus caption and theme", () => {
    render(
      <CinematicPhotoCard
        show
        photos={photos}
        slideIdx={0}
        stopName="Kyoto"
        theme="Temples & tea"
        dayCount={2}
        activeDayIdx={0}
        onBrokenImage={() => {}}
      />,
    );
    expect(document.querySelectorAll("img")).toHaveLength(2);
    expect(screen.getByText("Kyoto")).toBeInTheDocument();
    expect(screen.getByText("Temples & tea")).toBeInTheDocument();
  });

  it("delegates broken images upward", () => {
    const onBrokenImage = vi.fn();
    render(
      <CinematicPhotoCard show photos={["https://img/x.jpg"]} slideIdx={0} stopName="Osaka" dayCount={1} activeDayIdx={0} onBrokenImage={onBrokenImage} />,
    );
    fireEvent.error(document.querySelector("img")!);
    expect(onBrokenImage).toHaveBeenCalledWith("https://img/x.jpg");
  });

  it("shows a fallback gradient (no imgs) when there are no photos", () => {
    render(
      <CinematicPhotoCard show={false} photos={[]} slideIdx={0} stopName="Nara" dayCount={1} activeDayIdx={0} onBrokenImage={() => {}} />,
    );
    expect(document.querySelectorAll("img")).toHaveLength(0);
  });

  it("renders day-progress pips only when a stop spans multiple days", () => {
    const { rerender } = render(
      <CinematicPhotoCard show photos={photos} slideIdx={0} stopName="Kyoto" dayCount={1} activeDayIdx={0} onBrokenImage={() => {}} />,
    );
    // slide dots (2 photos) render, but no day pips for a single-day stop
    const single = document.querySelectorAll(".pointer-events-none").length;
    rerender(
      <CinematicPhotoCard show photos={photos} slideIdx={0} stopName="Kyoto" dayCount={3} activeDayIdx={1} onBrokenImage={() => {}} />,
    );
    expect(document.querySelectorAll(".pointer-events-none").length).toBeGreaterThan(single);
  });
});
