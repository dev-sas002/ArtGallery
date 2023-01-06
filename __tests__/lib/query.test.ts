import {
  EMPTY_QUERY,
  isEmptyQuery,
  mergeQueries,
  normalizeInteger,
  normalizeText,
  parseQuery,
} from '../../lib/search/query'

describe('normalizeText', () => {
  it('trims, unwraps repeated params and tolerates missing values', () => {
    expect(normalizeText('  van gogh ')).toBe('van gogh')
    expect(normalizeText(['first', 'second'])).toBe('first')
    expect(normalizeText(undefined)).toBe('')
    expect(normalizeText([])).toBe('')
  })
})

describe('normalizeInteger', () => {
  const bounds = { fallback: 12, min: 1, max: 48 }

  it.each([
    ['24', 24],
    ['24.9', 24],
    ['0', 1],
    ['-5', 1],
    ['9999', 48],
  ])('maps %s to %s', (input, expected) => {
    expect(normalizeInteger(input, bounds)).toBe(expected)
  })

  it.each([undefined, '', 'abc', 'Infinity'])('falls back for %s', (input) => {
    expect(normalizeInteger(input as string | undefined, bounds)).toBe(12)
  })
})

describe('parseQuery', () => {
  it('returns an empty query for blank input', () => {
    expect(parseQuery('   ')).toEqual(EMPTY_QUERY)
    expect(isEmptyQuery(parseQuery(''))).toBe(true)
  })

  it('lower-cases free text and drops single characters', () => {
    expect(parseQuery('Van GOGH a').terms).toEqual(['van', 'gogh'])
  })

  it('reads field tokens, quoted and bare', () => {
    const query = parseQuery('artist:"van gogh" medium:oil dept:\'asian art\' tag:landscape')

    expect(query.artists).toEqual(['van gogh'])
    expect(query.mediums).toEqual(['oil'])
    expect(query.departments).toEqual(['asian art'])
    expect(query.tags).toEqual(['landscape'])
    expect(query.terms).toEqual([])
  })

  it('leaves unknown field tokens in the free text', () => {
    expect(parseQuery('colour:blue').terms).toEqual(['colour:blue'])
  })

  it('keeps quoted phrases together', () => {
    expect(parseQuery('"still life" oil').terms).toEqual(['still life', 'oil'])
  })

  it.each([
    ['before 1800', { yearFrom: null, yearTo: 1799 }],
    ['after 1850', { yearFrom: 1851, yearTo: null }],
    ['1800-1900', { yearFrom: 1800, yearTo: 1900 }],
    ['1800 to 1900', { yearFrom: 1800, yearTo: 1900 }],
    ['19th century', { yearFrom: 1800, yearTo: 1899 }],
    ['1880s', { yearFrom: 1880, yearTo: 1889 }],
  ])('reads the date phrase %s', (input, expected) => {
    const query = parseQuery(input)
    expect({ yearFrom: query.yearFrom, yearTo: query.yearTo }).toEqual(expected)
  })

  it('combines a date phrase with the remaining words', () => {
    const query = parseQuery('seascapes before 1800')
    expect(query.terms).toEqual(['seascapes'])
    expect(query.yearTo).toBe(1799)
  })

  it('does not repeat a duplicated term', () => {
    expect(parseQuery('oil oil OIL').terms).toEqual(['oil'])
  })
})

describe('mergeQueries', () => {
  it('unions the list fields and lets the overlay win on dates', () => {
    const base = parseQuery('artist:monet before 1900')
    const merged = mergeQueries(base, { ...EMPTY_QUERY, artists: ['renoir'], yearFrom: 1850 })

    expect(merged.artists).toEqual(['monet', 'renoir'])
    expect(merged.yearFrom).toBe(1850)
    expect(merged.yearTo).toBe(1899)
  })
})
