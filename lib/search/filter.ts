import type { Artwork } from '../artwork'
import type { ArtworkQuery } from './query'
import { isEmptyQuery } from './query'

/**
 * A catalogue with its per-artwork match text precomputed.
 *
 * Building the lower-cased haystack once per catalogue load instead of once
 * per artwork per request is the difference between O(n) string allocations on
 * every keystroke and none at all. It matters as soon as the catalogue is
 * fetched from a source rather than hand-written.
 */
export type SearchIndex = {
  artworks: Artwork[]
  entries: IndexEntry[]
}

export type IndexEntry = {
  artwork: Artwork
  haystack: string
  artist: string
  medium: string
  department: string
  tags: string[]
}

const lower = (value: string) => value.toLowerCase()

export const buildIndex = (artworks: Artwork[]): SearchIndex => ({
  artworks,
  entries: artworks.map((artwork) => ({
    artwork,
    haystack: lower(
      [
        artwork.title,
        artwork.artist,
        artwork.medium,
        artwork.classification,
        artwork.department,
        artwork.culture,
        artwork.yearDisplay,
        artwork.tags.join(' '),
      ].join(' ')
    ),
    artist: lower(artwork.artist),
    medium: lower(`${artwork.medium} ${artwork.classification}`),
    department: lower(artwork.department),
    tags: artwork.tags.map(lower),
  })),
})

const anyIncludes = (haystacks: string[], needle: string) =>
  haystacks.some((haystack) => haystack.includes(needle))

export const matchesQuery = (entry: IndexEntry, query: ArtworkQuery): boolean => {
  if (query.terms.some((term) => !entry.haystack.includes(term))) return false
  if (query.artists.length && !query.artists.some((a) => entry.artist.includes(a))) return false
  if (query.mediums.length && !query.mediums.some((m) => entry.medium.includes(m))) return false
  if (query.departments.length && !query.departments.some((d) => entry.department.includes(d))) {
    return false
  }
  if (query.tags.length && !query.tags.some((tag) => anyIncludes(entry.tags, tag))) return false

  const { year } = entry.artwork
  if (query.yearFrom !== null && (!year || year < query.yearFrom)) return false
  if (query.yearTo !== null && (!year || year > query.yearTo)) return false

  return true
}

export const applyQuery = (index: SearchIndex, query: ArtworkQuery): Artwork[] => {
  if (isEmptyQuery(query)) return index.artworks

  const matches: Artwork[] = []
  for (const entry of index.entries) {
    if (matchesQuery(entry, query)) matches.push(entry.artwork)
  }
  return matches
}

export type Facet = { value: string; count: number }

/** Department counts for the filter chips, ordered by size then name. */
export const buildFacets = (artworks: Artwork[], limit = 8): Facet[] => {
  const counts = new Map<string, number>()

  for (const artwork of artworks) {
    if (!artwork.department) continue
    counts.set(artwork.department, (counts.get(artwork.department) || 0) + 1)
  }

  return Array.from(counts, ([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, limit)
}

export type Page<T> = { items: T[]; offset: number; limit: number; nextOffset: number | null }

export const paginate = <T>(items: T[], offset: number, limit: number): Page<T> => {
  const start = Math.max(0, Math.floor(offset))
  const size = Math.max(0, Math.floor(limit))
  const slice = items.slice(start, start + size)
  const end = start + slice.length

  return {
    items: slice,
    offset: start,
    limit: size,
    nextOffset: end < items.length ? end : null,
  }
}
