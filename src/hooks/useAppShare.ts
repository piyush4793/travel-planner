import { useCallback, useEffect, useRef, useState } from "react";
import { appUrl } from "../core/utils/appUrl";

const SHARE_BLURB =
  "Plan your trips with Roamwise — 197 countries, offline itineraries, cinematic maps & AI planning. Free, no account:";

type AppShare = {
  /** Absolute URL of the deployed app. */
  url: string;
  /** True when the browser exposes a usable Web Share API (mostly mobile). */
  canNativeShare: boolean;
  /** Native share flow: Web Share API → WhatsApp deep link → clipboard. */
  share: () => Promise<void>;
  /** Copy the app URL to the clipboard (well-positioned, desktop-friendly). */
  copyLink: () => Promise<void>;
  /** True for ~2s after a successful copy, for transient UI feedback. */
  copied: boolean;
};

/**
 * App-level "share Roamwise" behavior, extracted so the header control and the
 * Settings modal share one implementation (DRY). Cleans up its feedback timer.
 */
export function useAppShare(): AppShare {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number>(0);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const url = appUrl();
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const flagCopied = useCallback(() => {
    setCopied(true);
    clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 2000);
  }, []);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      flagCopied();
    } catch {
      /* clipboard unavailable — nothing more we can do */
    }
  }, [url, flagCopied]);

  const share = useCallback(async () => {
    const text = `${SHARE_BLURB} ${url}`;

    if (canNativeShare) {
      try {
        await navigator.share({ title: "Roamwise", text: SHARE_BLURB, url });
        return;
      } catch {
        // cancelled or unsupported payload — fall through to other channels
      }
    }

    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
    const win = window.open(wa, "_blank", "noopener,noreferrer");
    if (win) return;

    await copyLink();
  }, [url, canNativeShare, copyLink]);

  return { url, canNativeShare, share, copyLink, copied };
}
