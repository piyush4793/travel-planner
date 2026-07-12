/**
 * Country-bound action bundle shared across the plan workspace surfaces (header,
 * rails, preview pane). Every handler is pre-bound to the active destination in
 * PlanView, so the rails/pane never deal with country names — keeping the
 * scope-aware seam ready for the future multi-country trip composite.
 */
export type PlanActions = {
  isVisited: boolean;
  onToggleVisited?: () => void;
  isFavorite: boolean;
  onToggleFavorite?: () => void;
  aiPlanCount: number;
  notes: string;
  onSaveNotes?: (notes: string) => void;
};
