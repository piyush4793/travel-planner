import manifestData from "../../../data/rules/index.json";

type WishlistEntry = { name: string; creatorPick?: boolean };

// Computed once — the manifest is a static import.
const CREATOR_WISHLIST: string[] = (manifestData as WishlistEntry[])
  .filter((m) => m.creatorPick)
  .map((m) => m.name);

/**
 * The curated "creator's wishlist" — famous, rule-backed destinations offered as
 * a one-click starter pack in Discover. Distinct from the small auto-seeded set
 * (`inSeed`): the wishlist is opt-in, added only when the user asks for it.
 */
export function creatorWishlistNames(): string[] {
  return CREATOR_WISHLIST;
}
