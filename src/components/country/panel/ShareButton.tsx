import { useState, useCallback, useRef, useEffect } from "react";
import type { Country } from "../../../core/types";

type Props = {
  country: Country;
  homeCountry: string;
};

export default function ShareButton({ country, homeCountry }: Props) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number>(0);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleShare = useCallback(async () => {
    const lines: string[] = [
      `✈️ ${country.name}`,
      `From: ${homeCountry}`,
    ];

    if (country.bestMonths.length > 0) {
      lines.push(`Best months: ${country.bestMonths.join(", ")}`);
    }
    if (country.budget) {
      lines.push(`Budget: ${country.budget}`);
    }
    if (country.experiences.length > 0) {
      lines.push(`Experiences: ${country.experiences.join(", ")}`);
    }
    if (country.cities && country.cities.length > 0) {
      lines.push(`Cities: ${country.cities.map((c) => c.name).join(", ")}`);
    }
    if (country.combo && country.combo.length > 0) {
      lines.push(`Combine with: ${country.combo.join(", ")}`);
    }
    if (country.notes) {
      lines.push(`\nNotes: ${country.notes}`);
    }

    const text = lines.join("\n");

    // Use Web Share API if available (mobile), otherwise clipboard
    if (navigator.share) {
      try {
        await navigator.share({ title: `Trip to ${country.name}`, text });
        return;
      } catch {
        // User cancelled or API failed — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      timerRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      timerRef.current = window.setTimeout(() => setCopied(false), 2000);
    }
  }, [country, homeCountry]);

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors focus-ring ring-1 bg-white text-gray-500 ring-gray-200 hover:bg-gray-50 hover:text-gray-700"
      aria-label={copied ? "Copied to clipboard" : "Share destination"}
    >
      <span aria-hidden="true">{copied ? "✓" : "🔗"}</span>
      <span>{copied ? "Copied!" : "Share"}</span>
    </button>
  );
}
