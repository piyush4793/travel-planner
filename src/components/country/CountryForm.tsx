import { useState, useRef, type KeyboardEvent } from "react";
import type { Country, TravelStyle } from "../../core/types";
import { STYLE_META, TRAVEL_STYLES } from "../../core/utils/travelStyles";
import Tooltip from "../shared/Tooltip";
import ModalShell from "../shared/ModalShell";

const ALL_MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

type Props = {
  initial?: Country;
  existingNames: string[];
  onSave: (c: Country) => void;
  onClose: () => void;
};

export default function CountryForm({ initial, existingNames, onSave, onClose }: Props) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [lat, setLat] = useState(String(initial?.lat ?? ""));
  const [lng, setLng] = useState(String(initial?.lng ?? ""));
  const [bestMonths, setBestMonths] = useState<string[]>(initial?.bestMonths ?? []);
  const [worstMonths, setWorstMonths] = useState<string[]>(initial?.worstMonths ?? []);
  const [budget, setBudget] = useState(initial?.budget ?? "");
  const [experiences, setExperiences] = useState<string[]>(initial?.experiences ?? []);
  const [avoid, setAvoid] = useState<string[]>(initial?.avoid ?? []);
  const [combo, setCombo] = useState<string[]>(initial?.combo ?? []);
  const [landmark, setLandmark] = useState(initial?.landmark ?? "");
  const [travelStyle, setTravelStyle] = useState<TravelStyle[]>(initial?.travelStyle ?? []);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function toggleStyle(s: TravelStyle) {
    setTravelStyle((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  function toggleMonth(m: string, which: "best" | "worst") {
    const set = which === "best" ? bestMonths : worstMonths;
    const setter = which === "best" ? setBestMonths : setWorstMonths;
    setter(set.includes(m) ? set.filter((x) => x !== m) : [...set, m]);
  }

  function handleSubmit() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required.";
    else if (!isEdit && existingNames.map(n => n.toLowerCase()).includes(name.trim().toLowerCase()))
      errs.name = "A country with that name already exists.";
    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    if (isNaN(latN) || latN < -90 || latN > 90) errs.lat = "Must be between −90 and 90.";
    if (isNaN(lngN) || lngN < -180 || lngN > 180) errs.lng = "Must be between −180 and 180.";
    if (bestMonths.length === 0) errs.bestMonths = "Select at least one best month.";
    if (!budget.trim()) errs.budget = "Budget is required.";
    if (experiences.length === 0) errs.experiences = "Add at least one experience.";
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError(Object.values(errs)[0]);
      return;
    }
    setError("");
    onSave({
      name: name.trim(),
      lat: latN,
      lng: lngN,
      bestMonths,
      worstMonths: worstMonths.length ? worstMonths : undefined,
      budget: budget.trim(),
      experiences,
      avoid: avoid.length ? avoid : undefined,
      combo: combo.length ? combo : undefined,
      landmark: landmark.trim() || undefined,
      travelStyle: travelStyle.length ? travelStyle : undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <ModalShell
      open={true}
      onClose={onClose}
      label={isEdit ? `Edit ${initial?.name}` : "Add Country"}
      className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
      backdropClassName="bg-black/50"
    >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? `Edit — ${initial?.name}` : "Add Country"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none" aria-label="Close">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Name + Coords */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3">
              <Label>Country name</Label>
              <input
                className={`input ${fieldErrors.name ? "border-red-400" : ""}`}
                value={name}
                onChange={(e) => { setName(e.target.value); setFieldErrors((p) => { const { name: _, ...rest } = p; return rest; }); }}
                disabled={isEdit}
                placeholder="e.g. Japan"
                aria-invalid={!!fieldErrors.name}
              />
              {fieldErrors.name && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.name}</p>}
            </div>
            <div>
              <Label>Latitude</Label>
              <input
                className={`input ${fieldErrors.lat ? "border-red-400" : ""}`}
                type="number" step="any" min={-90} max={90}
                value={lat}
                onChange={(e) => { setLat(e.target.value); setFieldErrors((p) => { const { lat: _, ...rest } = p; return rest; }); }}
                placeholder="36.2"
                aria-invalid={!!fieldErrors.lat}
              />
              {fieldErrors.lat && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.lat}</p>}
            </div>
            <div>
              <Label>Longitude</Label>
              <input
                className={`input ${fieldErrors.lng ? "border-red-400" : ""}`}
                type="number" step="any" min={-180} max={180}
                value={lng}
                onChange={(e) => { setLng(e.target.value); setFieldErrors((p) => { const { lng: _, ...rest } = p; return rest; }); }}
                placeholder="138.2"
                aria-invalid={!!fieldErrors.lng}
              />
              {fieldErrors.lng && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.lng}</p>}
            </div>
            <div>
              <Label>Budget</Label>
              <input
                className={`input ${fieldErrors.budget ? "border-red-400" : ""}`}
                value={budget}
                onChange={(e) => { setBudget(e.target.value); setFieldErrors((p) => { const { budget: _, ...rest } = p; return rest; }); }}
                placeholder="₹2L–₹4L"
                aria-invalid={!!fieldErrors.budget}
              />
              {fieldErrors.budget && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.budget}</p>}
            </div>
          </div>

          {/* Travel style */}
          <div>
            <Label>Travel style</Label>
            <div className="flex gap-2">
              {TRAVEL_STYLES.map((s) => {
                const meta = STYLE_META[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStyle(s)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                      travelStyle.includes(s) ? meta.activeForm : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {meta.icon} {meta.label}
                    <Tooltip text={meta.description} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Best months */}
          <div>
            <Label>Best months to visit</Label>
            <MonthGrid selected={bestMonths} onToggle={(m) => { toggleMonth(m, "best"); setFieldErrors((p) => { const { bestMonths: _, ...rest } = p; return rest; }); }} color="green" />
            {fieldErrors.bestMonths && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.bestMonths}</p>}
          </div>

          {/* Worst months */}
          <div>
            <Label>Months to avoid</Label>
            <MonthGrid selected={worstMonths} onToggle={(m) => toggleMonth(m, "worst")} color="red" />
          </div>

          {/* Experiences */}
          <div>
            <Label>Experiences</Label>
            <TagInput tags={experiences} onChange={(t) => { setExperiences(t); setFieldErrors((p) => { const { experiences: _, ...rest } = p; return rest; }); }} placeholder="e.g. Beaches" />
            {fieldErrors.experiences && <p className="text-[11px] text-red-500 mt-1">{fieldErrors.experiences}</p>}
          </div>

          {/* Avoid notes */}
          <div>
            <Label>Watch out for (optional)</Label>
            <TagInput tags={avoid} onChange={setAvoid} placeholder="e.g. Monsoon season" />
          </div>

          {/* Combo */}
          <div>
            <Label>Combine with (optional)</Label>
            <TagInput tags={combo} onChange={setCombo} placeholder="e.g. Thailand" />
          </div>

          {/* Landmark */}
          <div>
            <Label>Landmark image (optional)</Label>
            <input
              className="input"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="Wikipedia title or image URL, e.g. Mount Fuji"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Wikipedia article name for the hover preview. Or paste a direct image URL / local path.
            </p>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes (optional)</Label>
            <textarea
              className="input resize-none"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Personal notes, reminders, or things to research..."
            />
          </div>

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 text-sm rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
          >
            {isEdit ? "Save changes" : "Add country"}
          </button>
        </div>
    </ModalShell>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{children}</p>;
}

function MonthGrid({ selected, onToggle, color }: { selected: string[]; onToggle: (m: string) => void; color: "green" | "red" }) {
  const active = color === "green" ? "bg-green-600 text-white" : "bg-red-500 text-white";
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {ALL_MONTHS.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onToggle(m)}
          className={`py-1 rounded text-[11px] font-medium transition-colors ${
            selected.includes(m) ? active : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {m.slice(0, 3)}
        </button>
      ))}
    </div>
  );
}

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [val, setVal] = useState("");

  function commit() {
    const trimmed = val.trim();
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed]);
    setVal("");
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); }
    if (e.key === "Backspace" && !val && tags.length) onChange(tags.slice(0, -1));
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 p-2 border border-gray-200 rounded-lg min-h-[40px] cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((t) => (
        <span key={t} className="flex items-center gap-1 px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
          {t}
          <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} className="opacity-60 hover:opacity-100">×</button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={onKey}
        onBlur={commit}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] text-sm outline-none bg-transparent"
      />
    </div>
  );
}
