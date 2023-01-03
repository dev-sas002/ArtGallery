import { makeArtwork, type Artwork } from '../artwork'
import type { ArtworkSource } from './source'

const API = 'https://collectionapi.metmuseum.org/public/collection/v1'

/** The subset of the Met object payload this adapter reads. */
type MetObject = {
  objectID: number
  title?: string
  artistDisplayName?: string
  artistNationality?: string
  objectBeginDate?: number
  objectDate?: string
  medium?: string
  classification?: string
  department?: string
  culture?: string
  dimensions?: string
  creditLine?: string
  tags?: { term?: string }[] | null
  primaryImage?: string
  primaryImageSmall?: string
  objectURL?: string
  isPublicDomain?: boolean
}

export type MetMuseumSourceOptions = {
  /** Search terms used to assemble the live catalogue. */
  queries?: string[]
  /** Objects inspected per query. Each one costs an upstream request. */
  candidatesPerQuery?: number
  fetchImpl?: typeof fetch
}

const DEFAULT_QUERIES = ['Vincent van Gogh', 'Claude Monet', 'Rembrandt', 'Hokusai']

export const toArtwork = (object: MetObject): Artwork =>
  makeArtwork({
    id: `met-${object.objectID}`,
    title: object.title?.trim() || 'Untitled',
    artist: object.artistDisplayName?.trim() || 'Unknown artist',
    artistNationality: object.artistNationality?.trim() || '',
    year: Number(object.objectBeginDate) || 0,
    yearDisplay: object.objectDate?.trim() || '',
    medium: object.medium?.trim() || '',
    classification: object.classification?.trim() || '',
    department: object.department?.trim() || '',
    culture: object.culture?.trim() || '',
    dimensions: object.dimensions?.trim() || '',
    creditLine: object.creditLine?.trim() || '',
    tags: (object.tags || [])
      .map((tag) => tag?.term)
      .filter((term): term is string => Boolean(term))
      .slice(0, 8),
    imageUrl: object.primaryImageSmall || '',
    imageUrlLarge: object.primaryImage || object.primaryImageSmall || '',
    sourceUrl: object.objectURL || '',
  })

/**
 * Live adapter for the Met Collection API — public, key-less, CC0.
 *
 * Opt in with `ARTWORK_SOURCE=met`. It exists to prove the seam is real: the
 * bundled catalogue and a remote museum API are interchangeable behind
 * `ArtworkSource`, and the caching in `catalog/index.ts` is what makes a
 * per-object upstream API usable at all.
 */
export const createMetMuseumSource = (options: MetMuseumSourceOptions = {}): ArtworkSource => {
  const queries = options.queries?.length ? options.queries : DEFAULT_QUERIES
  const candidates = options.candidatesPerQuery ?? 6
  const doFetch = options.fetchImpl ?? fetch

  const getJson = async <T>(url: string): Promise<T | null> => {
    const response = await doFetch(url, { headers: { Accept: 'application/json' } })
    if (!response.ok) return null
    return (await response.json()) as T
  }

  return {
    name: 'met',
    attribution: 'The Metropolitan Museum of Art Collection API (CC0)',
    list: async () => {
      const artworks: Artwork[] = []
      const seen = new Set<number>()

      for (const query of queries) {
        const search = await getJson<{ objectIDs: number[] | null }>(
          `${API}/search?${new URLSearchParams({ q: query, artistOrCulture: 'true' })}`
        )

        for (const id of (search?.objectIDs || []).slice(0, candidates)) {
          if (seen.has(id)) continue
          seen.add(id)

          const object = await getJson<MetObject>(`${API}/objects/${id}`)
          if (!object?.isPublicDomain || !object.primaryImageSmall) continue

          artworks.push(toArtwork(object))
        }
      }

      return artworks
    },
  }
}
