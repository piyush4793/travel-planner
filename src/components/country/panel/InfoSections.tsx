import { useState, useEffect, useMemo, useCallback, useId } from "react";
import type { CountryInfo } from "../../../utils/countryInfo";
import { fetchCountryInfo } from "../../../utils/countryInfo";
import { getPlanningLinks } from "../../../utils/planningLinks";
import { CollapsibleSection } from "./PanelSection";

type CountryLink = { label: string; url: string };

// Shared "open in new tab" arrow — used by every outbound link row below.
function ExternalLinkIcon() {
  return (
    <svg className="h-3 w-3 shrink-0 text-gray-400 transition-colors group-hover:text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

// ─── Learn about country ──────────────────────────────────────────────────────

export function LearnAboutSection({ countryName, currentCountryNameRef }: {
  countryName: string;
  currentCountryNameRef: React.RefObject<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [fetched, setFetched] = useState(false);
  const contentId = useId();

  // Reset state on country change
  useEffect(() => {
    setOpen(false);
    setCountryInfo(null);
    setLoading(false);
    setError(false);
    setFetched(false);
  }, [countryName]);

  const loadInfo = useCallback(() => {
    if (fetched || loading) return;
    setLoading(true);
    setError(false);
    fetchCountryInfo(countryName).then((info) => {
      if (currentCountryNameRef.current !== countryName) return;
      setCountryInfo(info);
      setFetched(true);
      setLoading(false);
    }).catch(() => {
      if (currentCountryNameRef.current !== countryName) return;
      setLoading(false);
      setError(true);
    });
  }, [fetched, loading, countryName, currentCountryNameRef]);

  const handleRetry = useCallback(() => {
    setFetched(false);
    setError(false);
  }, []);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadInfo();
  };

  // Trigger reload after retry resets state
  useEffect(() => {
    if (open && !loading && !countryInfo && !error) loadInfo();
  }, [open, loading, countryInfo, error, loadInfo]);

  return (
    <div className="rounded-xl bg-gray-50/50 p-3.5">
      <button onClick={handleToggle} aria-expanded={open} aria-controls={contentId} className="group flex w-full items-center gap-2 text-left focus-ring rounded">
        <span className={`text-xs text-gray-400 motion-safe:transition-transform motion-safe:duration-300 ease-out ${open ? "rotate-90 text-emerald-600" : ""}`}>▸</span>
        <span className="flex-1 text-[11px] font-semibold text-gray-500">Learn about {countryName} 🌐</span>
      </button>
      <div id={contentId} role="region" aria-label={`Learn about ${countryName}`} className={`grid motion-safe:transition-[grid-template-rows,opacity,margin] motion-safe:duration-300 ease-out ${open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className={`border-l pl-3 transition-colors duration-300 ${open ? "border-emerald-200" : "border-transparent"}`} aria-live="polite" aria-busy={loading}>
            {loading && (
              <div className="flex items-center gap-2 py-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                <span className="text-[11px] text-emerald-700">Loading info…</span>
              </div>
            )}
            {!loading && error && (
              <div className="flex items-center gap-2 py-2">
                <span className="text-[11px] text-gray-500">Failed to load info</span>
                <button onClick={handleRetry} className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 focus-ring rounded px-1.5 py-0.5">
                  Retry
                </button>
              </div>
            )}
            {!loading && countryInfo && (
              <div className="space-y-3">
                {countryInfo.thumbnail && (
                  <img
                    src={countryInfo.thumbnail}
                    alt={countryName}
                    className="w-full h-32 object-cover rounded-lg"
                    loading="lazy"
                  />
                )}

                {(countryInfo.capital || countryInfo.currency || countryInfo.language) && (
                  <div className="flex flex-wrap gap-2">
                    {countryInfo.capital && (
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                        🏛️ {countryInfo.capital}
                      </span>
                    )}
                    {countryInfo.currency && (
                      <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                        💰 {countryInfo.currency}
                      </span>
                    )}
                    {countryInfo.language && (
                      <span className="rounded-full bg-violet-50 border border-violet-200 px-2.5 py-1 text-[10px] font-semibold text-violet-700">
                        🗣️ {countryInfo.language}
                      </span>
                    )}
                  </div>
                )}

                <p className="text-xs leading-relaxed text-gray-600">{countryInfo.summary}</p>

                <a
                  href={`https://en.wikipedia.org/wiki/${encodeURIComponent(countryName.replace(/ /g, "_"))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                >
                  Read more on Wikipedia →
                </a>
              </div>
            )}
            {!loading && !countryInfo && open && (
              <p className="text-[11px] text-gray-400 py-1">Could not load info. Check your internet connection.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Planning resources ───────────────────────────────────────────────────────

export function PlanningResourcesSection({ countryName, homeCountry }: { countryName: string; homeCountry?: string }) {
  const links = useMemo(() => getPlanningLinks(countryName, homeCountry), [countryName, homeCountry]);

  return (
    <CollapsibleSection label="Planning resources 🧭" count={links.length}>
      <div className="space-y-2">
        {links.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-2.5 rounded-xl bg-white/80 px-3 py-2.5 shadow-sm shadow-slate-100 transition-colors hover:bg-slate-100 focus-ring"
          >
            <span className="text-base mt-0.5">{link.emoji}</span>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-emerald-700 group-hover:text-emerald-800">{link.label}</span>
              <p className="text-[10px] text-gray-400 leading-snug mt-0.5">{link.description}</p>
            </div>
            <span className="mt-1"><ExternalLinkIcon /></span>
          </a>
        ))}
      </div>
    </CollapsibleSection>
  );
}

// ─── Useful links (curated per-country) ───────────────────────────────────────

export function UsefulLinksSection({ links }: { links?: CountryLink[] }) {
  if (!links || links.length === 0) return null;

  return (
    <CollapsibleSection label="Useful links" count={links.length}>
      <div className="space-y-2">
        {links.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm shadow-slate-100 transition-colors hover:bg-slate-100 focus-ring"
          >
            <span className="text-base" aria-hidden>🔗</span>
            <span className="flex-1 truncate">{link.label}</span>
            <ExternalLinkIcon />
          </a>
        ))}
      </div>
    </CollapsibleSection>
  );
}
