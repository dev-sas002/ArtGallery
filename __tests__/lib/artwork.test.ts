import { displayYear, makeArtwork } from '../../lib/artwork'

describe('makeArtwork', () => {
  it('fills defaults and keeps the provided fields', () => {
    const result = makeArtwork({ id: 'x', title: 'Study', artist: 'Anon' })

    expect(result).toMatchObject({ id: 'x', title: 'Study', artist: 'Anon', year: 0, tags: [] })
  })

  it('defaults the artist when none is given', () => {
    expect(makeArtwork({ id: 'x', title: 'Study' }).artist).toBe('Unknown artist')
  })
})

describe('displayYear', () => {
  it.each([
    [{ yearDisplay: 'ca. 1889', year: 1889 }, 'ca. 1889'],
    [{ yearDisplay: '', year: 1889 }, '1889'],
    [{ yearDisplay: '', year: 0 }, 'Date unknown'],
  ])('renders %j as %s', (fields, expected) => {
    expect(displayYear(makeArtwork({ id: 'x', title: 't', ...fields }))).toBe(expected)
  })
})
