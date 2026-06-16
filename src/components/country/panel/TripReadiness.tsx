import { memo, useMemo } from "react";
import type { Country } from "../../../core/types";

type Props = {
  country: Country;
  isVisited: boolean;
  isFavorite: boolean;
  aiPlanCount: number;
  hasNotes: boolean;
};

type CheckItem = { label: string; done: boolean; icon: string };

function TripReadinessInner({ country, isVisited, isFavorite, aiPlanCount, hasNotes }: Props) {
  const checks = useMemo<CheckItem[]>(() => {
    const items: CheckItem[] = [
      { label: "Added to list", done: true, icon: "📋" },
      { label: "Best months identified", done: country.bestMonths.length > 0, icon: "📅" },
      { label: "Cities explored", done: (country.cities?.length ?? 0) > 0, icon: "🏙️" },
      { label: "Budget reviewed", done: !!country.budget, icon: "💰" },
      { label: "Notes added", done: hasNotes, icon: "📝" },
      { label: "AI plan created", done: aiPlanCount > 0, icon: "✨" },
      { label: "Marked as favorite", done: isFavorite, icon: "⭐" },
    ];
    if (isVisited) {
      items.push({ label: "Trip completed!", done: true, icon: "✅" });
    }
    return items;
  }, [country, isVisited, isFavorite, aiPlanCount, hasNotes]);

  const doneCount = checks.filter((c) => c.done).length;
  const total = checks.length;
  const percent = Math.round((doneCount / total) * 100);

  const barColor = percent === 100
    ? "from-emerald-400 to-emerald-500"
    : percent >= 60
      ? "from-blue-400 to-indigo-500"
      : "from-amber-400 to-orange-400";

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-[width] duration-500`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className={`text-xs font-bold tabular-nums ${
          percent === 100 ? "text-emerald-600" : "text-gray-500"
        }`}>
          {percent}%
        </span>
      </div>

      {/* Checklist */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
        {checks.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={`text-[10px] ${item.done ? "opacity-100" : "opacity-30"}`}>
              {item.done ? "✅" : "⬜"}
            </span>
            <span className={`text-[11px] ${
              item.done ? "text-gray-700 font-medium" : "text-gray-400"
            }`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const TripReadiness = memo(TripReadinessInner);
export default TripReadiness;
