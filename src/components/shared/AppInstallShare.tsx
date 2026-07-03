import { useCallback, useEffect, useRef, useState } from "react";

type Variant = "header" | "menu";

type Props = {
  canInstall: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  onInstall: () => Promise<boolean> | void;
  variant?: Variant;
};

/** Absolute URL of the deployed app (works on any host / subpath). */
function appUrl(): string {
  if (typeof window === "undefined") return "";
  return new URL(import.meta.env.BASE_URL, window.location.origin).href;
}

const SHARE_BLURB =
  "Plan your trips with Roamwise — 197 countries, offline itineraries, cinematic maps & AI planning. Free, no account:";

/**
 * Persistent app-level Install + Share controls.
 * Share uses the Web Share API, falling back to a WhatsApp deep link, then clipboard.
 * Install triggers the captured beforeinstallprompt (Android/desktop Chrome); iOS shows A2HS guidance.
 */
export default function AppInstallShare({ canInstall, isIOS, isStandalone, onInstall, variant = "header" }: Props) {
  const [copied, setCopied] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const timerRef = useRef<number>(0);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleShare = useCallback(async () => {
    const url = appUrl();
    const text = `${SHARE_BLURB} ${url}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "Roamwise", text: SHARE_BLURB, url });
        return;
      } catch {
        // cancelled or unsupported payload — fall through
      }
    }

    // WhatsApp deep link (opens chooser on mobile, WhatsApp Web on desktop)
    const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
    const win = window.open(wa, "_blank", "noopener,noreferrer");
    if (win) return;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      timerRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, []);

  const handleInstall = useCallback(() => {
    if (isIOS) {
      setShowIosHint((v) => !v);
      return;
    }
    void onInstall();
  }, [isIOS, onInstall]);

  const isMenu = variant === "menu";
  const showInstall = !isStandalone && (canInstall || isIOS);

  const shareBtnClass = isMenu
    ? "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/15 transition-colors focus-ring"
    : "flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full text-sm transition-colors border border-white/15 focus-ring";

  const installBtnClass = isMenu
    ? "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-white text-blue-700 hover:bg-blue-50 transition-colors focus-ring"
    : "flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-bold bg-white text-blue-700 hover:bg-blue-50 transition-colors focus-ring";

  return (
    <div className="relative flex items-center gap-2">
      {showInstall && (
        <button onClick={handleInstall} className={installBtnClass} aria-label="Install Roamwise app">
          <span aria-hidden="true">📲</span>
          <span>{isMenu ? "Install app" : "Install"}</span>
        </button>
      )}

      <button
        onClick={handleShare}
        className={shareBtnClass}
        aria-label={copied ? "Link copied" : "Share Roamwise"}
        title="Share app"
      >
        <span aria-hidden="true">{copied ? "✓" : "🔗"}</span>
        {isMenu && <span>{copied ? "Copied!" : "Share app"}</span>}
      </button>

      {showIosHint && (
        <div
          role="dialog"
          aria-label="Install on iOS"
          className="absolute right-0 top-full mt-2 z-50 w-60 rounded-xl bg-white text-gray-700 shadow-xl border border-gray-200 p-3 text-[11px] leading-relaxed"
        >
          <p className="font-bold text-gray-900 mb-1">Install on iPhone / iPad</p>
          <ol className="space-y-1 list-decimal list-inside">
            <li>Tap the <span className="font-semibold">Share</span> icon in Safari</li>
            <li>Choose <span className="font-semibold">Add to Home Screen</span></li>
          </ol>
          <button
            onClick={() => setShowIosHint(false)}
            className="mt-2 text-blue-600 font-semibold focus-ring rounded"
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}
