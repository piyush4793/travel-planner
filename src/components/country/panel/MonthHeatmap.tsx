import { memo, useMemo } from "react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Props = {
  bestMonths: string[];
  worstMonths: string[];
};

function MonthHeatmapInner({ bestMonths, worstMonths }: Props) {
  const bestSet = useMemo(() => new Set(bestMonths), [bestMonths]);
  const worstSet = useMemo(() => new Set(worstMonths), [worstMonths]);
  const currentMonthIndex = new Date().getMonth();

  // Only show months that have a designation
  const rows = useMemo(() => {
    return MONTHS.map((m, i) => {
      const isBest = bestSet.has(m);
      const isWorst = worstSet.has(m);
      if (!isBest && !isWorst) return null;
      return { full: m, short: SHORT[i], index: i, best: isBest, worst: isWorst };
    }).filter(Boolean) as { full: string; short: string; index: number; best: boolean; worst: boolean }[];
  }, [bestSet, worstSet]);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-1" role="img" aria-label="Monthly travel suitability">
      {rows.map((row) => {
        const isCurrent = row.index === currentMonthIndex;
        return (
          <div key={row.full} className="flex items-center gap-2">
            <span className={`w-8 shrink-0 text-[10px] font-bold tabular-nums ${
              isCurrent ? "text-blue-600" : "text-gray-500"
            }`}>
              {row.short}
            </span>
            <div className="flex-1 h-4 relative rounded-full overflow-hidden bg-gray-100">
              <div
                className={`absolute inset-0 rounded-full transition-colors ${
                  row.best
                    ? "bg-gradient-to-r from-emerald-400 to-emerald-300"
                    : "bg-gradient-to-r from-red-400 to-red-300"
                }`}
              />
              {isCurrent && (
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
              )}
            </div>
            <span className={`shrink-0 text-[9px] font-semibold ${
              row.best ? "text-emerald-600" : "text-red-500"
            }`}>
              {row.best ? "Best" : "Avoid"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const MonthHeatmap = memo(MonthHeatmapInner);
export default MonthHeatmap;
