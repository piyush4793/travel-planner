import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AppInstallShare from "@/components/shared/AppInstallShare.tsx";

let breakpoint: "mobile" | "tablet" | "desktop" = "desktop";
vi.mock("@/hooks/useBreakpoint", () => ({
  useBreakpoint: () => breakpoint,
}));

const baseProps = {
  canInstall: false,
  isIOS: false,
  isStandalone: false,
  onInstall: vi.fn(),
};

afterEach(() => {
  vi.restoreAllMocks();
  breakpoint = "desktop";
  Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
});

describe("AppInstallShare", () => {
  it("renders a Copy action in the header variant", () => {
    render(<AppInstallShare {...baseProps} />);
    expect(screen.getByRole("button", { name: /copy app link/i })).toBeInTheDocument();
  });

  it("renders a Share action in the menu variant", () => {
    render(<AppInstallShare {...baseProps} variant="menu" />);
    expect(screen.getByRole("button", { name: /share app/i })).toBeInTheDocument();
  });

  it("shows Install when installable and calls onInstall", () => {
    const onInstall = vi.fn();
    render(<AppInstallShare {...baseProps} canInstall onInstall={onInstall} />);
    const install = screen.getByRole("button", { name: /install roamwise app/i });
    fireEvent.click(install);
    expect(onInstall).toHaveBeenCalledTimes(1);
  });

  it("hides Install when already running standalone but keeps Share", () => {
    render(<AppInstallShare {...baseProps} canInstall isStandalone onInstall={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /install roamwise app/i })).toBeNull();
    expect(screen.getByRole("button", { name: /copy app link/i })).toBeInTheDocument();
  });

  it("shows iOS A2HS guidance instead of prompting on iOS", () => {
    const onInstall = vi.fn();
    render(<AppInstallShare {...baseProps} isIOS onInstall={onInstall} />);
    fireEvent.click(screen.getByRole("button", { name: /install roamwise app/i }));
    expect(onInstall).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: /install on ios/i })).toBeInTheDocument();
  });

  it("copies the app link (no native popover) in the header variant", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<AppInstallShare {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /copy app link/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain("http");
  });

  it("uses the Web Share API in the menu variant when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    render(<AppInstallShare {...baseProps} variant="menu" />);
    fireEvent.click(screen.getByRole("button", { name: /share app/i }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const arg = share.mock.calls[0][0];
    expect(arg.title).toBe("Roamwise");
    expect(arg.url).toContain("http");
  });

  it("falls back to a WhatsApp deep link in the menu variant when Web Share is unavailable", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue({} as Window);
    render(<AppInstallShare {...baseProps} variant="menu" />);
    fireEvent.click(screen.getByRole("button", { name: /share app/i }));
    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    expect(open.mock.calls[0][0]).toContain("wa.me");
  });

  it("uses the native share sheet in the header variant on a phone (WhatsApp etc.)", async () => {
    breakpoint = "mobile";
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    render(<AppInstallShare {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /share app/i }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share.mock.calls[0][0].url).toContain("http");
  });

  it("falls back to a WhatsApp deep link in the header on a phone without Web Share", async () => {
    breakpoint = "mobile";
    const open = vi.spyOn(window, "open").mockReturnValue({} as Window);
    render(<AppInstallShare {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /share app/i }));
    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    expect(open.mock.calls[0][0]).toContain("wa.me");
  });

  it("shows Open app (not Install) when already installed but viewed in a browser tab", () => {
    const onOpenApp = vi.fn();
    render(
      <AppInstallShare
        {...baseProps}
        canInstall
        installedInBrowser
        onOpenApp={onOpenApp}
      />,
    );
    expect(screen.queryByRole("button", { name: /install roamwise app/i })).toBeNull();
    const open = screen.getByRole("button", { name: /open roamwise app/i });
    fireEvent.click(open);
    expect(onOpenApp).toHaveBeenCalledTimes(1);
  });

  it("does not show Open app when running standalone", () => {
    render(
      <AppInstallShare
        {...baseProps}
        installedInBrowser
        isStandalone
        onOpenApp={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /open roamwise app/i })).toBeNull();
  });
});
