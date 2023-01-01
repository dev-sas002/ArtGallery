import type { Artwork } from '../artwork'

/**
 * The seam this project is built around.
 *
 * Everything above this line — search, pagination, the API route, the UI —
 * depends only on `ArtworkSource`. Swapping the bundled catalogue for a live
 * museum API, a database, or a customer's own collection means writing one
 * adapter and registering it; nothing else changes.
 */
export interface ArtworkSource {
  /** Identifier used by `ARTWORK_SOURCE` and reported on the API response. */
  readonly name: string
  /** Human-readable attribution shown in the UI footer. */
  readonly attribution: string
  /** Returns the whole catalogue. Callers cache it; sources need not. */
  list(): Promise<Artwork[]>
}

export type ArtworkSourceFactory = () => ArtworkSource
