import type { Country } from "../../../core/types";
import type { useCountryRule } from "../../../hooks/useCountryRule";
import { STYLE_META } from "../../../core/utils/travelStyles";
import { getCountryFlag } from "../../../utils/countryFlags";
import Tooltip from "../../shared/Tooltip";
import { getBudgetBadges } from "./utils";

type Props = {
  country: Country;
  consolidated: ReturnType<typeof useCountryRule>["data"];
  ruleLoading: boolean;
  homeCountry: string;
  recDays: number;
  isVisited: boolean;
  onToggleVisited: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onClose: () => void;
  extraActions?: React.ReactNode;
};

export default function PanelHeader({
  country, consolidated, ruleLoading, homeCountry, recDays,
  isVisited, onToggleVisited,
  isFavorite, onToggleFavorite,
  onEdit, onClose, extraActions,
}: Props) {
  const budgetBadges = getBudgetBadges(country, consolidated);
  const bestMonthsPreview = (country.bestMonths ?? []).slice(0, 3);

  return (
    <div className="sticky top-0 z-10 shrink-0">
      {/* Hero gradient header */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 px-5 pt-4 pb-3.5 text-white">
        {/* Top row: flag + name + close */}
        <div className="flex items-start gap-3">
          <span className="text-4xl leading-none drop-shadow-sm mt-0.5">{getCountryFlag(country.name)}</span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-black text-white leading-tight tracking-tight">
              {country.name}
            </h2>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">
              from {homeCountry}
              {ruleLoading && <span className="ml-2 text-[10px] text-blue-400">Loading…</span>}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus-ring"
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>

        {/* Budget strip — grouped into one card to reduce chip clutter */}
        <div className="mt-3 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white/[0.06] px-3 py-1.5 ring-1 ring-white/10">
          {budgetBadges.map((badge, i) => (
            <span key={badge.label} className="inline-flex items-center gap-1.5">
              {i > 0 && <span className="text-white/15" aria-hidden="true">|</span>}
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-200">
                <span aria-hidden="true">{badge.icon}</span>
                <span>{badge.label}</span>
              </span>
            </span>
          ))}
        </div>

        {/* Trip facts — recommended days, best months, travel style on one row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-1 text-[10px] font-semibold text-blue-300 ring-1 ring-blue-400/20">
            ⏱️ {recDays}d rec
          </span>
          {bestMonthsPreview.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-400/20">
              🌤️ {bestMonthsPreview.join(", ")}
            </span>
          )}
          {(country.travelStyle ?? []).map((style) => {
            const meta = STYLE_META[style];
            if (!meta) return null;
            return (
              <Tooltip
                key={style}
                variant="wrap"
                text={meta.description}
                triggerClassName="gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-slate-200 ring-1 ring-white/10 min-h-[28px] hover:bg-white/15 transition-colors"
              >
                <span aria-hidden="true">{meta.icon}</span>
                <span>{meta.label}</span>
                <span aria-hidden="true" className="ml-0.5 text-[8px] opacity-50">ⓘ</span>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* Action bar — sits below gradient */}
      <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5 bg-white border-b border-gray-100">
        <ActionPill
          active={isVisited}
          onClick={onToggleVisited}
          activeClassName="bg-emerald-50 text-emerald-700 ring-emerald-200"
          icon={isVisited ? "✓" : "○"}
          label="Visited"
        />
        <ActionPill
          active={isFavorite}
          onClick={onToggleFavorite}
          activeClassName="bg-amber-50 text-amber-600 ring-amber-200"
          icon={isFavorite ? "★" : "☆"}
          label="Favorite"
        />
        <ActionPill onClick={onEdit} icon="✏️" label="Edit" />
        {extraActions}
      </div>
    </div>
  );
}

function ActionPill({ icon, label, onClick, active = false, activeClassName }: {
  icon: string;
  label: string;
  onClick: () => void;
  active?: boolean;
  activeClassName?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-colors focus-ring ring-1 ${
        active
          ? activeClassName ?? "bg-slate-100 text-slate-700 ring-slate-200"
          : "bg-white text-gray-500 ring-gray-200 hover:bg-gray-50 hover:text-gray-700"
      }`}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
