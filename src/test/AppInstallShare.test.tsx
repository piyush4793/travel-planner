import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AppInstallShare from "../components/shared/AppInstallShare";

const baseProps = {
  canInstall: false,
  isIOS: false,
  isStandalone: false,
  onInstall: vi.fn(),
};

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
});

describe("AppInstallShare", () => {
  it("always renders a Share action", () => {
    render(<AppInstallShare {...baseProps} />);
    expect(screen.getByRole("button", { name: /share roamwise/i })).toBeInTheDocument();
  });

  it("shows Install when installable and calls onInstall", () => {
    const onInstall = vi.fn();
    render(<AppInstallShare {...baseProps} canInstall onInstall={onInstall} />);
    const install = screen.getByRole("button", { name: /install roamwise app/i });
    fireEvent.click(install);
    expect(onInstall).toHaveBeenCalledTimes(1);
  });

  it("hides Install when already running standalone", () => {
    render(<AppInstallShare {...baseProps} canInstall isStandalone onInstall={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /install roamwise app/i })).toBeNull();
    expect(screen.getByRole("button", { name: /share roamwise/i })).toBeInTheDocument();
  });

  it("shows iOS A2HS guidance instead of prompting on iOS", () => {
    const onInstall = vi.fn();
    render(<AppInstallShare {...baseProps} isIOS onInstall={onInstall} />);
    fireEvent.click(screen.getByRole("button", { name: /install roamwise app/i }));
    expect(onInstall).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: /install on ios/i })).toBeInTheDocument();
  });

  it("uses the Web Share API with the app URL when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    render(<AppInstallShare {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /share roamwise/i }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const arg = share.mock.calls[0][0];
    expect(arg.title).toBe("Roamwise");
    expect(arg.url).toContain("http");
  });

  it("falls back to a WhatsApp deep link when Web Share is unavailable", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue({} as Window);
    render(<AppInstallShare {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /share roamwise/i }));
    await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
    expect(open.mock.calls[0][0]).toContain("wa.me");
  });
});
