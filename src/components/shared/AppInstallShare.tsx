import { useCallback, useState } from "react";
import { useAppShare } from "../../hooks/useAppShare";
import { useBreakpoint } from "../../hooks/useBreakpoint";

type Variant = "header" | "menu";

type Props = {
  canInstall: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  installedInBrowser?: boolean;
  onInstall: () => Promise<boolean> | void;
  onOpenApp?: () => void;
  variant?: Variant;
};

/**
 * Persistent app-level Install + Share controls.
 * Install triggers the captured beforeinstallprompt (Android/desktop Chrome); iOS shows A2HS guidance.
 * When the PWA is already installed but viewed in a browser tab, Install is replaced by "Open app".
 * Share adapts to context: on a phone/tablet (and the Settings menu) it opens the
 * native share sheet (Web Share → WhatsApp deep link → clipboard) so the app can be
 * shared to WhatsApp etc.; on desktop it copies the link (the desktop native share
 * popover is off-position, so a clean clipboard copy is friendlier there).
 */
export default function AppInstallShare({
  canInstall,
  isIOS,
  isStandalone,
  installedInBrowser = false,
  onInstall,
  onOpenApp,
  variant = "header",
}: Props) {
  const { share, copyLink, copied } = useAppShare();
  const breakpoint = useBreakpoint();
  const [showIosHint, setShowIosHint] = useState(false);

  const handleInstall = useCallback(() => {
    if (isIOS) {
      setShowIosHint((v) => !v);
      return;
    }
    void onInstall();
  }, [isIOS, onInstall]);

  const isMenu = variant === "menu";
  const showOpenApp = !isStandalone && installedInBrowser && !!onOpenApp;
  const showInstall = !isStandalone && !installedInBrowser && (canInstall || isIOS);
  // Native share sheet on touch surfaces (mobile/tablet) + the Settings menu;
  // clipboard copy only on desktop where the native popover is mispositioned.
  const useNativeShare = isMenu || breakpoint !== "desktop";
  const onShare = useNativeShare ? share : copyLink;
  const shareLabel = copied ? "Link copied" : useNativeShare ? "Share app" : "Copy app link";

  const shareBtnClass = isMenu
    ? "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/15 transition-colors focus-ring"
    : "flex items-center justify-center gap-1.5 h-8 px-2.5 min-w-[32px] bg-surface-2 hover:bg-surface-3 text-brand-800 rounded-full text-sm transition-colors border border-line focus-ring";

  const installBtnClass = isMenu
    ? "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold bg-surface-1 text-brand-700 hover:bg-brand-50 transition-colors focus-ring"
    : "flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-bold bg-brand-700 text-white hover:bg-brand-800 transition-colors focus-ring";

  return (
    <div className="relative flex items-center gap-2">
      {showOpenApp && (
        <button onClick={onOpenApp} className={installBtnClass} aria-label="Open Roamwise app">
          <span aria-hidden="true">🚀</span>
          {isMenu ? (
            <span>Open app</span>
          ) : (
            <>
              <span className="lg:hidden">Open</span>
              <span className="hidden lg:inline">Open app</span>
            </>
          )}
        </button>
      )}

      {showInstall && (
        <button onClick={handleInstall} className={installBtnClass} aria-label="Install Roamwise app">
          <span aria-hidden="true">📲</span>
          {isMenu ? (
            <span>Install app</span>
          ) : (
            <>
              <span className="lg:hidden">Install</span>
              <span className="hidden lg:inline">Install app</span>
            </>
          )}
        </button>
      )}

      <button
        onClick={() => void onShare()}
        className={shareBtnClass}
        aria-label={shareLabel}
        title={shareLabel}
      >
        <span aria-hidden="true">{copied ? "✓" : "🔗"}</span>
        {isMenu ? (
          <span>{copied ? "Copied!" : "Share app"}</span>
        ) : (
          <span className="hidden lg:inline text-xs font-semibold">{copied ? "Copied!" : "Share"}</span>
        )}
      </button>

      {showIosHint && (
        <div
          role="dialog"
          aria-label="Install on iOS"
          className="absolute right-0 top-full mt-2 z-50 w-60 rounded-xl bg-surface-1 text-ink-body shadow-xl border border-line p-3 text-[11px] leading-relaxed"
        >
          <p className="font-bold text-ink-1 mb-1">Install on iPhone / iPad</p>
          <ol className="space-y-1 list-decimal list-inside">
            <li>Tap the <span className="font-semibold">Share</span> icon in Safari</li>
            <li>Choose <span className="font-semibold">Add to Home Screen</span></li>
          </ol>
          <button
            onClick={() => setShowIosHint(false)}
            className="mt-2 text-brand-700 font-semibold focus-ring rounded"
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}
