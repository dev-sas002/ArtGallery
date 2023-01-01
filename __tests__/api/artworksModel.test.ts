import { createMocks } from 'node-mocks-http'
import { clearCatalogCache } from '../../lib/catalog'
import { clearInterpretationCache } from '../../lib/search/interpret'

// The real SDK would need a key and the network; this stand-in answers every
// request with the same structured interpretation.
const create = jest.fn(async () => ({
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        terms: [],
        artists: [],
        mediums: [],
        departments: [],
        tags: ['seascapes'],
        yearFrom: null,
        yearTo: null,
      }),
    },
  ],
}))

jest.mock('@anthropic-ai/sdk', () =>
  jest.fn().mockImplementation(() => ({
    messages: { create },
  }))
)

// eslint-disable-next-line import/first
import handler, { type ArtworksResponse } from '../../pages/api/artworks'

const call = async (query: Record<string, string>) => {
  const { req, res } = createMocks({ method: 'GET', query })
  await handler(req as never, res as never)
  return res._getJSONData() as ArtworksResponse
}

beforeEach(() => {
  clearCatalogCache()
  clearInterpretationCache()
  create.mockClear()
  process.env.ANTHROPIC_API_KEY = 'test-key'
})

afterAll(() => {
  delete process.env.ANTHROPIC_API_KEY
})

describe('GET /api/artworks with a model interpreter', () => {
  it('reports the model path and reuses the cached interpretation', async () => {
    const first = await call({ search: 'stormy sea' })
    const second = await call({ search: 'stormy sea' })

    expect(first.interpretedBy).toBe('model')
    expect(first.query.tags).toEqual(['seascapes'])
    expect(second.interpretedBy).toBe('model')
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('does not let a department chip leak into the cached interpretation', async () => {
    const filtered = await call({ search: 'stormy sea', department: 'Asian Art' })
    const unfiltered = await call({ search: 'stormy sea' })

    expect(filtered.query.departments).toEqual(['asian art'])
    expect(unfiltered.query.departments).toEqual([])
  })
})
