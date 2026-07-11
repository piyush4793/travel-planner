import { useCallback, useEffect, useRef, useState } from "react";
import type { Country } from "../core/types";
import type { TripPlan } from "../core/utils/tripPlans";
import type { PdfRouteStop } from "../utils/pdfModel";
import { isEnabled } from "../core/featureFlags";
import { appUrl } from "../core/utils/appUrl";
import { buildShareText } from "../components/country/panel/shareText";

export type ShareStatus = "idle" | "working" | "copied";

type ItineraryShare = {
  /** Share the destination + itinerary: native PDF file → native text → clipboard. */
  share: () => Promise<void>;
  /** Warm the PDF chunk ahead of a click so the share gesture stays activated. */
  prefetch: () => void;
  status: ShareStatus;
};

const isAbort = (err: unknown): boolean =>
  err instanceof DOMException && err.name === "AbortError";

/** True when the platform can share files through the native share sheet (mostly mobile). */
function supportsFileShare(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function"
  );
}

/**
 * Country/itinerary sharing, extracted from ShareButton so the async PDF-file
 * flow stays testable and the button stays a thin view.
 *
 * Priority: native share sheet with a real PDF attached (no download) →
 * native text share → clipboard copy (desktop). The jsPDF-backed generator is
 * dynamically imported so it never enters the initial bundle; `prefetch` warms
 * that chunk on pointer/focus so the click's await stays within the user gesture.
 */
export function useItineraryShare(
  country: Country,
  homeCountry: string,
  plan?: TripPlan | null,
  routeStops?: PdfRouteStop[],
): ItineraryShare {
  const [status, setStatus] = useState<ShareStatus>("idle");
  const timerRef = useRef<number>(0);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const canAttachPdf = !!plan && isEnabled("pdfExport") && supportsFileShare();

  const prefetch = useCallback(() => {
    if (canAttachPdf) void import("../utils/pdfDocument").catch(() => {});
  }, [canAttachPdf]);

  const flagCopied = useCallback(() => {
    setStatus("copied");
    clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setStatus("idle"), 2000);
  }, []);

  const copyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flagCopied();
      return;
    } catch {
      /* fall through to legacy copy */
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      flagCopied();
    } finally {
      document.body.removeChild(textarea);
    }
  }, [flagCopied]);

  const share = useCallback(async () => {
    const text = buildShareText(country, homeCountry, plan);
    const url = appUrl();
    const title = `Trip to ${country.name}`;

    // 1. Native share sheet with the itinerary PDF attached — no download.
    if (canAttachPdf && plan) {
      setStatus("working");
      try {
        const { buildItineraryPdfBlob, itineraryPdfName } = await import("../utils/pdfDocument");
        const file = new File([buildItineraryPdfBlob(plan, country, homeCountry, routeStops)], itineraryPdfName(country), {
          type: "application/pdf",
        });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title, text });
          setStatus("idle");
          return;
        }
      } catch (err) {
        setStatus("idle");
        if (isAbort(err)) return; // user dismissed the sheet — don't fall back
        // otherwise fall through to text/clipboard
      }
      setStatus("idle");
    }

    // 2. Native text share (mobile without file support).
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        if (isAbort(err)) return;
      }
    }

    // 3. Clipboard fallback (desktop).
    await copyText(`${text}\n\n${url}`);
  }, [country, homeCountry, plan, routeStops, canAttachPdf, copyText]);

  return { share, prefetch, status };
}
