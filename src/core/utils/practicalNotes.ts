export type NoteItem = { icon: string; label: string; value: string };

/**
 * Parse a plan's free-form `note` string into structured, labelled items.
 * Notes are authored as segments separated by " | "; each segment is
 * categorised (Route/SIM/Tips/Apps/Timing/Note) with an icon and label so both
 * the on-screen itinerary and the shared PDF can render a consistent layout.
 * A single unlabelled item is returned when the note has no segments.
 */
export function parseNoteItems(note: string): NoteItem[] {
  const parts = note.split(" | ").map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return [{ icon: "📝", label: "", value: note }];
  return parts.map((part) => {
    if (part.includes("→") && part.includes(":")) return { icon: "🚆", label: "Route", value: part };
    if (/^SIM:/i.test(part)) return { icon: "📱", label: "SIM", value: part.replace(/^SIM:\s*/i, "") };
    if (/^Extras?:/i.test(part)) return { icon: "💡", label: "Tips", value: part.replace(/^Extras?:\s*/i, "") };
    if (part.includes("·")) return { icon: "📲", label: "Apps", value: part };
    if (/best\s+(month|for|time)/i.test(part)) return { icon: "📅", label: "Timing", value: part };
    return { icon: "📝", label: "Note", value: part };
  });
}
