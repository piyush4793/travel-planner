import manifestData from "../../../data/domestic/india/index.json";
import { createManifestSource, type ManifestEntry } from "./manifestSource";

/**
 * Domestic India rule manifest (`data/domestic/india/index.json`) — one row per
 * plannable state/UT, the same denormalized shape as the world manifest. Powers
 * the domestic picker, day bounds and "combine with" state suggestions through
 * the shared {@link createManifestSource} factory.
 */
const MANIFEST = manifestData as ManifestEntry[];

export const domesticIndiaManifestSource = createManifestSource(MANIFEST);
