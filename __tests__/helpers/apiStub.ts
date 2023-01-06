import type { Artwork } from '../../lib/artwork'
import { buildFacets, paginate } from '../../lib/search/filter'

export type StubOptions = {
  artworks: Artwork[]
  interpretedBy?: 'heuristic' | 'model'
}

/**
 * A stand-in for `GET /api/artworks` that honours search, department, limit
 * and offset, so page tests exercise the real pagination and filtering flow
 * without a server.
 */
export const createFetchStub = ({ artworks, interpretedBy = 'heuristic' }: StubOptions) => {
  const calls: string[] = []

  const impl = jest.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost')
    calls.push(url.pathname + url.search)

    const search = (url.searchParams.get('search') || '').toLowerCase()
    const department = url.searchParams.get('department') || ''
    const limit = Number(url.searchParams.get('limit') || 12)
    const offset = Number(url.searchParams.get('offset') || 0)

    const matches = artworks.filter(
      (item) =>
        (!search || `${item.title} ${item.artist}`.toLowerCase().includes(search)) &&
        (!department || item.department === department)
    )
    const page = paginate(matches, offset, limit)

    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: page.items,
        total: matches.length,
        returned: page.items.length,
        offset: page.offset,
        limit: page.limit,
        nextOffset: page.nextOffset,
        facets: { departments: buildFacets(artworks) },
        query: {},
        interpretedBy,
        source: 'stub',
        attribution: 'Stub collection',
      }),
    } as unknown as Response
  })

  return { impl, calls }
}
