import { useMemo } from "react";
import ModalShell from "../../shared/ModalShell";
import { getCountryFlag } from "../../../utils/countryFlags";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Full curated wishlist (names). */
  names: string[];
  /** Names already in the user's list — shown as already-added, excluded from the add count. */
  inListNames: Set<string>;
  /** Called with only the not-yet-added names. */
  onConfirm: (toAdd: string[]) => void;
};

const DIALOG_CLASS =
  "w-full max-w-lg sm:rounded-2xl rounded-t-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]";

export default function CreatorWishlistDialog({ open, onClose, names, inListNames, onConfirm }: Props) {
  const toAdd = useMemo(() => names.filter((n) => !inListNames.has(n)), [names, inListNames]);
  const alreadyIn = names.length - toAdd.length;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      label="Creator's wishlist"
      backdropClassName="bg-black/50 backdrop-blur-sm"
      className={DIALOG_CLASS}
    >
      <div className="px-5 pt-5 pb-3 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900">✨ Creator's wishlist</h2>
        <p className="mt-1 text-xs text-gray-500 leading-relaxed">
          {names.length} famous, ready-to-plan destinations to kickstart your list. Add them all — you can remove any later.
        </p>
      </div>

      <div className="px-5 py-4 overflow-y-auto grow">
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" aria-label="Wishlist destinations">
          {names.map((name) => {
            const added = inListNames.has(name);
            return (
              <li
                key={name}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] border ${
                  added
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-gray-50 text-gray-700"
                }`}
              >
                <span aria-hidden="true">{getCountryFlag(name)}</span>
                <span className="truncate">{name}</span>
                {added && <span className="ml-auto text-emerald-500" aria-label="already in list">✓</span>}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2">
        <span className="text-[11px] text-gray-500 mr-auto">
          {alreadyIn > 0 ? `${alreadyIn} already in list · ` : ""}
          {toAdd.length} to add
        </span>
        <button
          onClick={onClose}
          className="focus-ring min-h-[36px] px-4 py-2 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(toAdd)}
          disabled={toAdd.length === 0}
          className="focus-ring min-h-[36px] px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {toAdd.length === 0 ? "All added" : `Add ${toAdd.length} to My List`}
        </button>
      </div>
    </ModalShell>
  );
}
