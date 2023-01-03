/**
 * The structured query every search path produces.
 *
 * The UI sends a single string; both the heuristic parser here and the
 * optional model-backed interpreter in `interpret.ts` turn that string into
 * this shape. Filtering only ever sees `ArtworkQuery`, so adding a smarter
 * front end never touches the matching code.
 */
export type ArtworkQuery = {
  /** Free-text terms, already lower-cased. All must match. */
  terms: string[]
  artists: string[]
  mediums: string[]
  departments: string[]
  tags: string[]
  yearFrom: number | null
  yearTo: number | null
}

export const EMPTY_QUERY: ArtworkQuery = {
  terms: [],
  artists: [],
  mediums: [],
  departments: [],
  tags: [],
  yearFrom: null,
  yearTo: null,
}

export const isEmptyQuery = (query: ArtworkQuery): boolean =>
  query.terms.length === 0 &&
  query.artists.length === 0 &&
  query.mediums.length === 0 &&
  query.departments.length === 0 &&
  query.tags.length === 0 &&
  query.yearFrom === null &&
  query.yearTo === null

/** Next.js exposes repeated query params as arrays; take the first usable value. */
export const firstValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value

export const normalizeText = (value: string | string[] | undefined): string => {
  const raw = firstValue(value)
  return typeof raw === 'string' ? raw.trim() : ''
}

export const normalizeInteger = (
  value: string | string[] | undefined,
  { fallback, min, max }: { fallback: number; min: number; max: number }
): number => {
  const raw = firstValue(value)
  const parsed = Number(raw)

  if (raw === undefined || raw === '' || !Number.isFinite(parsed)) return fallback

  return Math.min(Math.max(Math.floor(parsed), min), max)
}

const FIELD_ALIASES: Record<string, keyof ArtworkQuery> = {
  artist: 'artists',
  by: 'artists',
  medium: 'mediums',
  department: 'departments',
  dept: 'departments',
  tag: 'tags',
}

/** `artist:"van gogh"`, `medium:oil`, `tag:landscape` — one field token. */
const FIELD_TOKEN = /(\w+):(?:"([^"]+)"|'([^']+)'|(\S+))/g
const QUOTED_TOKEN = /"([^"]+)"|'([^']+)'/g

const clean = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ')

const pushUnique = (target: string[], value: string) => {
  const normalized = clean(value)
  if (normalized && !target.includes(normalized)) target.push(normalized)
}

type YearRange = { from: number | null; to: number | null }

/**
 * Recognises the date phrasings people actually type. Anything unrecognised is
 * left in the free-text terms, so a miss degrades to a substring search rather
 * than dropping the words.
 */
const readYearRange = (input: string): { range: YearRange; rest: string } => {
  const range: YearRange = { from: null, to: null }
  let rest = input

  const take = (pattern: RegExp, apply: (match: RegExpMatchArray) => void) => {
    const match = rest.match(pattern)
    if (!match) return
    apply(match)
    rest = rest.replace(pattern, ' ')
  }

  take(/\b(1[0-9]{3}|20[0-9]{2})\s*(?:-|–|to)\s*(1[0-9]{3}|20[0-9]{2})\b/i, (match) => {
    range.from = Number(match[1])
    range.to = Number(match[2])
  })
  take(/\bbefore\s+(\d{3,4})\b/i, (match) => {
    range.to = Number(match[1]) - 1
  })
  take(/\bafter\s+(\d{3,4})\b/i, (match) => {
    range.from = Number(match[1]) + 1
  })
  take(/\b(\d{2})(?:th|st|nd|rd)\s+century\b/i, (match) => {
    const century = Number(match[1])
    range.from = range.from ?? (century - 1) * 100
    range.to = range.to ?? century * 100 - 1
  })
  take(/\b(\d{3,4})0s\b/i, (match) => {
    const decade = Number(`${match[1]}0`)
    range.from = range.from ?? decade
    range.to = range.to ?? decade + 9
  })

  return { range, rest }
}

/**
 * Turns a raw search string into an `ArtworkQuery` with no network access and
 * no configuration. This is the default search, and the floor the optional
 * model-backed interpreter is merged on top of.
 */
export const parseQuery = (raw: string): ArtworkQuery => {
  const query: ArtworkQuery = {
    terms: [],
    artists: [],
    mediums: [],
    departments: [],
    tags: [],
    yearFrom: null,
    yearTo: null,
  }

  let rest = (raw || '').trim()
  if (!rest) return query

  rest = rest.replace(FIELD_TOKEN, (match, field: string, quoted, single, bare) => {
    const target = FIELD_ALIASES[field.toLowerCase()]
    if (!target) return match
    pushUnique(query[target] as string[], quoted || single || bare || '')
    return ' '
  })

  const years = readYearRange(rest)
  query.yearFrom = years.range.from
  query.yearTo = years.range.to
  rest = years.rest

  rest = rest.replace(QUOTED_TOKEN, (_match, double, single) => {
    pushUnique(query.terms, double || single || '')
    return ' '
  })

  for (const word of clean(rest).split(' ')) {
    if (word.length > 1) pushUnique(query.terms, word)
  }

  return query
}

/** Field-wise union; used to layer a model interpretation over the heuristic one. */
export const mergeQueries = (base: ArtworkQuery, extra: ArtworkQuery): ArtworkQuery => {
  const union = (a: string[], b: string[]) => Array.from(new Set([...a, ...b]))

  return {
    terms: union(base.terms, extra.terms),
    artists: union(base.artists, extra.artists),
    mediums: union(base.mediums, extra.mediums),
    departments: union(base.departments, extra.departments),
    tags: union(base.tags, extra.tags),
    yearFrom: extra.yearFrom ?? base.yearFrom,
    yearTo: extra.yearTo ?? base.yearTo,
  }
}
