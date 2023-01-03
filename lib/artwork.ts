/**
 * The single domain type. Every layer — sources, search, API, UI — speaks in
 * `Artwork`; adapters are responsible for mapping their upstream shape onto it.
 */
export type Artwork = {
  /** Stable identifier, namespaced by whichever source produced it. */
  id: string
  title: string
  artist: string
  artistNationality: string
  /** Earliest year associated with the work; `0` when the source has none. */
  year: number
  /** The source's own date string, e.g. "ca. 1889" — preferred for display. */
  yearDisplay: string
  medium: string
  classification: string
  department: string
  culture: string
  dimensions: string
  creditLine: string
  tags: string[]
  imageUrl: string
  imageUrlLarge: string
  sourceUrl: string
}

/** Fills in the optional half of an `Artwork` so adapters stay short. */
export const makeArtwork = (
  partial: Pick<Artwork, 'id' | 'title'> & Partial<Artwork>
): Artwork => ({
  artist: 'Unknown artist',
  artistNationality: '',
  year: 0,
  yearDisplay: '',
  medium: '',
  classification: '',
  department: '',
  culture: '',
  dimensions: '',
  creditLine: '',
  tags: [],
  imageUrl: '',
  imageUrlLarge: '',
  sourceUrl: '',
  ...partial,
})

/** Human-readable date, falling back to the numeric year. */
export const displayYear = (artwork: Artwork): string =>
  artwork.yearDisplay || (artwork.year ? String(artwork.year) : 'Date unknown')
