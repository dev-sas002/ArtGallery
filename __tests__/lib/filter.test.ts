import {
  applyQuery,
  buildFacets,
  buildIndex,
  matchesQuery,
  paginate,
} from '../../lib/search/filter'
import { EMPTY_QUERY, parseQuery } from '../../lib/search/query'
import { artwork, CATALOGUE } from '../helpers/factory'

const index = buildIndex(CATALOGUE)
const titles = (query: ReturnType<typeof parseQuery>) =>
  applyQuery(index, query).map((item) => item.title)

describe('buildIndex', () => {
  it('precomputes a lower-cased haystack covering every searchable field', () => {
    const entry = index.entries[0]

    expect(entry.haystack).toContain('wheat field with cypresses')
    expect(entry.haystack).toContain('vincent van gogh')
    expect(entry.haystack).toContain('european paintings')
    expect(entry.haystack).toContain('landscapes')
    expect(entry.haystack).toBe(entry.haystack.toLowerCase())
  })
})

describe('applyQuery', () => {
  it('returns the whole catalogue for an empty query without copying it', () => {
    expect(applyQuery(index, EMPTY_QUERY)).toBe(index.artworks)
  })

  it('matches case-insensitively across title, artist and medium', () => {
    expect(titles(parseQuery('VAN GOGH'))).toEqual(['Wheat Field with Cypresses'])
    expect(titles(parseQuery('woodblock'))).toEqual(['The Great Wave'])
  })

  it('requires every free-text term to match', () => {
    expect(titles(parseQuery('oil harvesters'))).toEqual(['The Harvesters'])
    expect(titles(parseQuery('oil woodblock'))).toEqual([])
  })

  it('filters by artist, medium, department and tag fields', () => {
    expect(titles(parseQuery('artist:hokusai'))).toEqual(['The Great Wave'])
    expect(titles(parseQuery('medium:prints'))).toEqual(['The Great Wave'])
    expect(titles(parseQuery('department:"asian art"'))).toEqual(['The Great Wave'])
    expect(titles(parseQuery('tag:seascapes'))).toEqual(['The Great Wave'])
  })

  it('filters by year range and excludes undated works', () => {
    expect(titles(parseQuery('before 1600'))).toEqual(['The Harvesters'])
    expect(titles(parseQuery('after 1850'))).toEqual(['Wheat Field with Cypresses'])
    expect(titles(parseQuery('1800-1900')).sort()).toEqual([
      'The Great Wave',
      'Wheat Field with Cypresses',
    ])

    const undated = buildIndex([artwork({ id: 'x', title: 'Undated', year: 0 })])
    expect(applyQuery(undated, parseQuery('after 1500'))).toEqual([])
    expect(applyQuery(undated, parseQuery('before 1500'))).toEqual([])
  })

  it('does not mutate the source catalogue', () => {
    const before = [...CATALOGUE]
    applyQuery(index, parseQuery('van gogh'))
    expect(CATALOGUE).toEqual(before)
  })
})

describe('matchesQuery', () => {
  it('treats multiple values within a field as alternatives', () => {
    const entry = index.entries[1]
    expect(matchesQuery(entry, { ...EMPTY_QUERY, artists: ['monet', 'hokusai'] })).toBe(true)
    expect(matchesQuery(entry, { ...EMPTY_QUERY, artists: ['monet'] })).toBe(false)
  })
})

describe('buildFacets', () => {
  it('counts departments, ordered by size then name, ignoring blanks', () => {
    expect(buildFacets([...CATALOGUE, artwork({ id: 'n', department: '' })])).toEqual([
      { value: 'European Paintings', count: 2 },
      { value: 'Asian Art', count: 1 },
    ])
  })

  it('respects the limit', () => {
    expect(buildFacets(CATALOGUE, 1)).toHaveLength(1)
  })
})

describe('paginate', () => {
  it('slices a window and reports the next offset', () => {
    expect(paginate([1, 2, 3, 4, 5], 0, 2)).toEqual({
      items: [1, 2],
      offset: 0,
      limit: 2,
      nextOffset: 2,
    })
  })

  it('reports no next offset on the final page', () => {
    expect(paginate([1, 2, 3], 2, 2).nextOffset).toBeNull()
  })

  it('clamps a negative offset and an out-of-range offset', () => {
    expect(paginate([1, 2, 3], -4, 2).items).toEqual([1, 2])
    expect(paginate([1, 2, 3], 99, 2).items).toEqual([])
  })
})
