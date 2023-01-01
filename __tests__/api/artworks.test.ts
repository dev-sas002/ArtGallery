import { createMocks, type RequestMethod } from 'node-mocks-http'
import handler, { type ArtworksResponse } from '../../pages/api/artworks'
import { clearCatalogCache } from '../../lib/catalog'
import { clearInterpretationCache } from '../../lib/search/interpret'

type Query = Record<string, string | string[]>

const call = async (query: Query = {}, method: RequestMethod = 'GET') => {
  const { req, res } = createMocks({ method, query })
  await handler(req as never, res as never)
  return { res, body: res._getJSONData() }
}

beforeEach(() => {
  clearCatalogCache()
  clearInterpretationCache()
  delete process.env.ANTHROPIC_API_KEY
  delete process.env.ARTWORK_SOURCE
})

describe('GET /api/artworks', () => {
  it('returns a first page with facets, totals and attribution', async () => {
    const { res, body } = await call()
    const payload = body as ArtworksResponse

    expect(res._getStatusCode()).toBe(200)
    expect(payload.data).toHaveLength(12)
    expect(payload.returned).toBe(12)
    expect(payload.total).toBeGreaterThan(12)
    expect(payload.offset).toBe(0)
    expect(payload.nextOffset).toBe(12)
    expect(payload.source).toBe('local')
    expect(payload.attribution).toContain('Metropolitan')
    expect(payload.interpretedBy).toBe('heuristic')
    expect(payload.facets.departments[0]).toMatchObject({ value: expect.any(String) })
  })

  it('sets a cacheable, revalidating Cache-Control header', async () => {
    const { res } = await call()

    expect(res.getHeader('Cache-Control')).toBe('public, s-maxage=60, stale-while-revalidate=300')
  })

  it('filters by search term', async () => {
    const { body } = await call({ search: 'van gogh' })
    const payload = body as ArtworksResponse

    expect(payload.total).toBeGreaterThan(0)
    for (const item of payload.data) {
      expect(item.artist.toLowerCase()).toContain('van gogh')
    }
  })

  it('understands a structured search term', async () => {
    const { body } = await call({ search: 'department:"asian art"' })
    const payload = body as ArtworksResponse

    expect(payload.total).toBeGreaterThan(0)
    for (const item of payload.data) {
      expect(item.department).toBe('Asian Art')
    }
  })

  it('filters by the department parameter, overriding the parsed query', async () => {
    const { body } = await call({
      search: 'department:"european paintings"',
      department: 'Asian Art',
    })
    const payload = body as ArtworksResponse

    expect(payload.query.departments).toEqual(['asian art'])
    for (const item of payload.data) {
      expect(item.department).toBe('Asian Art')
    }
  })

  it('pages with offset and reports a null nextOffset at the end', async () => {
    const first = (await call({ limit: '5' })).body as ArtworksResponse
    const second = (await call({ limit: '5', offset: '5' })).body as ArtworksResponse

    expect(second.offset).toBe(5)
    expect(second.data[0].id).not.toBe(first.data[0].id)

    const last = (await call({ limit: '5', offset: String(first.total) })).body as ArtworksResponse
    expect(last.data).toEqual([])
    expect(last.nextOffset).toBeNull()
  })

  it('clamps the limit and falls back for junk values', async () => {
    expect(((await call({ limit: '999' })).body as ArtworksResponse).limit).toBe(48)
    expect(((await call({ limit: '0' })).body as ArtworksResponse).limit).toBe(1)
    expect(((await call({ limit: 'abc' })).body as ArtworksResponse).limit).toBe(12)
  })

  it('uses the first value of a repeated query parameter', async () => {
    const { body } = await call({ search: ['hokusai', 'ignored'] })

    expect((body as ArtworksResponse).query.terms).toEqual(['hokusai'])
  })

  it('returns an empty page rather than an error for a search that matches nothing', async () => {
    const { res, body } = await call({ search: 'zzzz-no-such-artwork' })

    expect(res._getStatusCode()).toBe(200)
    expect((body as ArtworksResponse).total).toBe(0)
    expect((body as ArtworksResponse).data).toEqual([])
  })

  it('rejects non-GET methods with an Allow header', async () => {
    const { res, body } = await call({}, 'POST')

    expect(res._getStatusCode()).toBe(405)
    expect(res.getHeader('Allow')).toEqual(['GET'])
    expect(body).toEqual({ error: 'Method Not Allowed' })
  })
})
