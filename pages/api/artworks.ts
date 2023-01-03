import type { NextApiRequest, NextApiResponse } from 'next'
import type { Artwork } from '../../lib/artwork'
import { getCatalog, resolveSource } from '../../lib/catalog'
import { applyQuery, buildFacets, paginate, type Facet } from '../../lib/search/filter'
import { createClaudeInterpreter, interpretSearch } from '../../lib/search/interpret'
import { normalizeInteger, normalizeText, type ArtworkQuery } from '../../lib/search/query'

export const DEFAULT_LIMIT = 12
export const MAX_LIMIT = 48

export type ArtworksResponse = {
  data: Artwork[]
  total: number
  returned: number
  offset: number
  limit: number
  nextOffset: number | null
  facets: { departments: Facet[] }
  query: ArtworkQuery
  interpretedBy: 'heuristic' | 'model'
  source: string
  attribution: string
}

export type ErrorResponse = { error: string }

const aiEnabled = (value: string | string[] | undefined) =>
  normalizeText(value).toLowerCase() !== 'off'

/**
 * `GET /api/artworks`
 *
 * The route is deliberately thin: parse and clamp input, ask the domain layer
 * for an answer, set cache headers. All matching, pagination and
 * interpretation logic lives in `lib/`, where it is testable without HTTP.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ArtworksResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const search = normalizeText(req.query.search)
    const department = normalizeText(req.query.department)
    const limit = normalizeInteger(req.query.limit, {
      fallback: DEFAULT_LIMIT,
      min: 1,
      max: MAX_LIMIT,
    })
    const offset = normalizeInteger(req.query.offset, {
      fallback: 0,
      min: 0,
      max: Number.MAX_SAFE_INTEGER,
    })

    const source = resolveSource()
    const catalog = await getCatalog(source)

    const interpreter = createClaudeInterpreter({
      vocabulary: {
        departments: buildFacets(catalog.artworks, 20).map((facet) => facet.value),
        mediums: Array.from(
          new Set(catalog.artworks.map((artwork) => artwork.classification).filter(Boolean))
        ).slice(0, 20),
        artists: Array.from(new Set(catalog.artworks.map((artwork) => artwork.artist))).slice(
          0,
          40
        ),
      },
    })

    const { query, interpretedBy } = await interpretSearch(search, {
      interpreter,
      enabled: aiEnabled(req.query.ai),
    })

    if (department) query.departments = [department.toLowerCase()]

    const matches = applyQuery(catalog, query)
    const page = paginate(matches, offset, limit)

    // Results are a pure function of the catalogue and the query, and the
    // catalogue only changes when the source does — so this is safe to cache
    // at the edge and revalidate in the background.
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')

    return res.status(200).json({
      data: page.items,
      total: matches.length,
      returned: page.items.length,
      offset: page.offset,
      limit: page.limit,
      nextOffset: page.nextOffset,
      // Facets are computed over the *unfiltered* catalogue so the chips do
      // not vanish as soon as one of them is selected.
      facets: { departments: buildFacets(catalog.artworks) },
      query,
      interpretedBy,
      source: source.name,
      attribution: source.attribution,
    })
  } catch (error) {
    console.error('[api/artworks] request failed', error)
    return res.status(500).json({ error: 'Unexpected server error' })
  }
}
