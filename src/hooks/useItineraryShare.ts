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
  // Cache of the rendered PDF blob keyed by a content signature, so the expensive
  // html2canvas render happens on prefetch (pointer/focus) and the click awaits an
  // already-resolved promise — keeping navigator.share within the user gesture
  // (iOS requires transient activation, which a slow await would consume).
  const pdfCacheRef = useRef<{ sig: string; blob: Promise<Blob> } | null>(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const canAttachPdf = !!plan && isEnabled("pdfExport") && supportsFileShare();

  const contentSig = useCallback((): string => {
    const stops = routeStops?.map((s) => `${s.name}:${s.dayCount}`).join("|") ?? "";
    return [country.name, homeCountry, plan?.duration, plan?.costPerPerson, plan?.days.length, stops].join("~");
  }, [country.name, homeCountry, plan, routeStops]);

  // Render + cache the PDF blob for the current content, reusing an in-flight or
  // matching render. Returns the blob promise so callers can await it.
  const ensurePdfBlob = useCallback((): Promise<Blob> | null => {
    if (!canAttachPdf || !plan) return null;
    const sig = contentSig();
    const cached = pdfCacheRef.current;
    if (cached && cached.sig === sig) return cached.blob;
    const blob = import("../utils/pdfDocument").then(({ buildItineraryPdfBlob }) =>
      buildItineraryPdfBlob(plan, country, homeCountry, routeStops),
    );
    blob.catch(() => {}); // mark handled so warming rejections aren't unhandled
    pdfCacheRef.current = { sig, blob };
    return blob;
  }, [canAttachPdf, plan, country, homeCountry, routeStops, contentSig]);

  const prefetch = useCallback(() => {
    void ensurePdfBlob();
  }, [ensurePdfBlob]);

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
        const blobPromise = ensurePdfBlob();
        const { itineraryPdfName } = await import("../utils/pdfDocument");
        const blob = await blobPromise;
        if (blob) {
          const file = new File([blob], itineraryPdfName(country), { type: "application/pdf" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title, text });
            setStatus("idle");
            return;
          }
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
  }, [country, homeCountry, plan, canAttachPdf, ensurePdfBlob, copyText]);

  return { share, prefetch, status };
}
