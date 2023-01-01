import type { Artwork } from '../../lib/artwork'
import {
  clearCatalogCache,
  DEFAULT_SOURCE,
  getCatalog,
  listSourceNames,
  registerSource,
  resolveSource,
} from '../../lib/catalog'
import { createLocalSource } from '../../lib/catalog/localSource'
import type { ArtworkSource } from '../../lib/catalog/source'
import { CATALOGUE } from '../helpers/factory'

const stubSource = (name: string, items: Artwork[], onList = () => {}): ArtworkSource => ({
  name,
  attribution: 'Stub',
  list: async () => {
    onList()
    return items
  },
})

describe('source registry', () => {
  beforeEach(() => {
    clearCatalogCache()
    delete process.env.ARTWORK_SOURCE
  })

  it('ships local and met adapters', () => {
    expect(listSourceNames()).toEqual(expect.arrayContaining(['local', 'met']))
  })

  it('defaults to the bundled catalogue', () => {
    expect(resolveSource().name).toBe(DEFAULT_SOURCE)
  })

  it('reads ARTWORK_SOURCE', () => {
    process.env.ARTWORK_SOURCE = 'MET'
    expect(resolveSource().name).toBe('met')
  })

  it('falls back to local and warns for an unknown source', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    expect(resolveSource('nope').name).toBe('local')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown ARTWORK_SOURCE'))

    warn.mockRestore()
  })

  it('accepts a source registered at runtime', async () => {
    registerSource('stub', () => stubSource('stub', CATALOGUE))

    const source = resolveSource('stub')
    expect(source.name).toBe('stub')
    expect((await getCatalog(source)).artworks).toHaveLength(CATALOGUE.length)
  })
})

describe('getCatalog', () => {
  beforeEach(clearCatalogCache)

  it('indexes the source output', async () => {
    const catalog = await getCatalog(stubSource('once', CATALOGUE))

    expect(catalog.artworks).toEqual(CATALOGUE)
    expect(catalog.entries).toHaveLength(CATALOGUE.length)
  })

  it('caches per source so a repeat request does not hit the source again', async () => {
    const listed = jest.fn()
    const source = stubSource('cached', CATALOGUE, listed)

    await getCatalog(source)
    await getCatalog(source)

    expect(listed).toHaveBeenCalledTimes(1)
  })

  it('collapses concurrent cold-start requests into one source call', async () => {
    const listed = jest.fn()
    const source = stubSource('concurrent', CATALOGUE, listed)

    await Promise.all([getCatalog(source), getCatalog(source), getCatalog(source)])

    expect(listed).toHaveBeenCalledTimes(1)
  })
})

describe('local source', () => {
  it('returns the bundled catalogue with usable records', async () => {
    const artworks = await createLocalSource().list()

    expect(artworks.length).toBeGreaterThan(20)
    for (const item of artworks) {
      expect(item.id).toMatch(/^met-\d+$/)
      expect(item.title).not.toBe('')
      expect(item.imageUrl).toMatch(/^https:\/\//)
    }
  })
})
