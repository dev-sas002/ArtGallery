import { createMetMuseumSource, toArtwork } from '../../lib/catalog/metMuseumSource'

const json = (body: unknown) => ({ ok: true, json: async () => body }) as unknown as Response
const notFound = { ok: false, json: async () => ({}) } as unknown as Response

const OBJECT = {
  objectID: 436535,
  title: 'Wheat Field with Cypresses',
  artistDisplayName: 'Vincent van Gogh',
  artistNationality: 'Dutch',
  objectBeginDate: 1889,
  objectDate: '1889',
  medium: 'Oil on canvas',
  classification: 'Paintings',
  department: 'European Paintings',
  dimensions: '28 3/4 x 36 3/4 in.',
  creditLine: 'Purchase, 1993',
  tags: [{ term: 'Landscapes' }, { term: undefined }],
  primaryImage: 'https://images.metmuseum.org/large.jpg',
  primaryImageSmall: 'https://images.metmuseum.org/small.jpg',
  objectURL: 'https://www.metmuseum.org/art/collection/search/436535',
  isPublicDomain: true,
}

describe('toArtwork', () => {
  it('maps the Met payload onto the domain type', () => {
    expect(toArtwork(OBJECT)).toMatchObject({
      id: 'met-436535',
      title: 'Wheat Field with Cypresses',
      artist: 'Vincent van Gogh',
      year: 1889,
      tags: ['Landscapes'],
      imageUrl: 'https://images.metmuseum.org/small.jpg',
    })
  })

  it('substitutes defaults for the fields the Met leaves blank', () => {
    expect(toArtwork({ objectID: 1 })).toMatchObject({
      title: 'Untitled',
      artist: 'Unknown artist',
      year: 0,
      tags: [],
      imageUrl: '',
    })
  })
})

describe('createMetMuseumSource', () => {
  it('searches, fetches objects and keeps only public-domain works with images', async () => {
    const fetchImpl = jest.fn(async (url: string | URL | Request) => {
      const href = String(url)
      if (href.includes('/search')) return json({ objectIDs: [1, 2, 3] })
      if (href.endsWith('/1')) return json(OBJECT)
      if (href.endsWith('/2')) return json({ ...OBJECT, objectID: 2, isPublicDomain: false })
      return json({ ...OBJECT, objectID: 3, primaryImageSmall: '' })
    }) as unknown as typeof fetch

    const artworks = await createMetMuseumSource({
      queries: ['van gogh'],
      candidatesPerQuery: 3,
      fetchImpl,
    }).list()

    expect(artworks.map((item) => item.id)).toEqual(['met-436535'])
  })

  it('skips a query whose search fails and never repeats an object id', async () => {
    const fetchImpl = jest.fn(async (url: string | URL | Request) => {
      const href = String(url)
      if (href.includes('q=broken')) return notFound
      if (href.includes('/search')) return json({ objectIDs: [1] })
      return json(OBJECT)
    }) as unknown as typeof fetch

    const source = createMetMuseumSource({
      queries: ['broken', 'good', 'also-good'],
      fetchImpl,
    })

    expect(await source.list()).toHaveLength(1)
    expect(source.name).toBe('met')
    expect(source.attribution).toContain('Metropolitan')
  })

  it('tolerates a search that returns no ids', async () => {
    const fetchImpl = jest.fn(async () => json({ objectIDs: null })) as unknown as typeof fetch

    expect(await createMetMuseumSource({ queries: ['nothing'], fetchImpl }).list()).toEqual([])
  })
})
