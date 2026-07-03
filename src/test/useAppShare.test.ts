import { renderHook, act, waitFor } from "@testing-library/react";
import { useAppShare } from "../hooks/useAppShare";

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
});

describe("useAppShare", () => {
  it("exposes an absolute app URL", () => {
    const { result } = renderHook(() => useAppShare());
    expect(result.current.url).toContain("http");
  });

  it("reports canNativeShare based on navigator.share", () => {
    Object.defineProperty(navigator, "share", { value: vi.fn(), configurable: true });
    const { result } = renderHook(() => useAppShare());
    expect(result.current.canNativeShare).toBe(true);
  });

  it("copyLink writes the URL to the clipboard and flags copied", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { result } = renderHook(() => useAppShare());
    await act(async () => { await result.current.copyLink(); });
    expect(writeText).toHaveBeenCalledWith(result.current.url);
    await waitFor(() => expect(result.current.copied).toBe(true));
  });

  it("share falls back to a WhatsApp deep link when native share is unavailable", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue({} as Window);
    const { result } = renderHook(() => useAppShare());
    await act(async () => { await result.current.share(); });
    expect(open).toHaveBeenCalledTimes(1);
    expect(open.mock.calls[0][0]).toContain("wa.me");
  });
});
