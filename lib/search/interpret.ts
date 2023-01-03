import Anthropic from '@anthropic-ai/sdk'
import { createTtlCache } from '../cache/ttlCache'
import { mergeQueries, parseQuery, type ArtworkQuery } from './query'

/**
 * Natural-language search.
 *
 * The heuristic parser in `query.ts` already understands `artist:`, `before
 * 1900`, `19th century` and quoted phrases. This module adds the half a
 * parser cannot do — "moody seascapes painted before the impressionists",
 * "Japanese woodblock prints of waves" — by asking Claude to fill in the same
 * `ArtworkQuery` shape against the catalogue's real vocabulary.
 *
 * Three properties matter here:
 *
 * - **It is additive.** The model result is merged *on top of* the heuristic
 *   parse, never instead of it, so a bad interpretation cannot lose the user's
 *   literal words.
 * - **It is optional.** With no `ANTHROPIC_API_KEY` the interpreter is simply
 *   absent and search behaves exactly as it does today. Nothing is disabled,
 *   nothing warns on every request.
 * - **It is cached.** Interpretations are keyed by the raw query string, so a
 *   repeated search — or a second visitor typing the same thing — costs
 *   nothing.
 */
export type Interpretation = {
  query: ArtworkQuery
  /** Which path produced the query: the local parser or the model. */
  interpretedBy: 'heuristic' | 'model'
}

/** The seam the AI sits behind. Returning `null` means "no opinion". */
export type QueryInterpreter = (raw: string) => Promise<Partial<ArtworkQuery> | null>

export type CatalogVocabulary = {
  departments: string[]
  artists: string[]
  mediums: string[]
}

export const MODEL = 'claude-opus-5'

const SCHEMA = {
  type: 'object',
  properties: {
    terms: {
      type: 'array',
      items: { type: 'string' },
      description: 'Free-text keywords that should all appear somewhere in the record.',
    },
    artists: { type: 'array', items: { type: 'string' } },
    mediums: { type: 'array', items: { type: 'string' } },
    departments: { type: 'array', items: { type: 'string' } },
    tags: { type: 'array', items: { type: 'string' } },
    yearFrom: { type: ['integer', 'null'] },
    yearTo: { type: ['integer', 'null'] },
  },
  required: ['terms', 'artists', 'mediums', 'departments', 'tags', 'yearFrom', 'yearTo'],
  additionalProperties: false,
} as const

const systemPrompt = (vocabulary: CatalogVocabulary) =>
  [
    "You translate a visitor's search phrase into a structured filter over a museum catalogue.",
    'Return only values that could plausibly match the catalogue below; prefer fewer, broader',
    'filters over many narrow ones, and leave a field empty when the phrase says nothing about it.',
    'Use `terms` for descriptive words (subject matter, mood, colour), not for artist or medium names.',
    '',
    `Departments: ${vocabulary.departments.join(', ') || 'unknown'}`,
    `Mediums: ${vocabulary.mediums.join(', ') || 'unknown'}`,
    `Artists: ${vocabulary.artists.join(', ') || 'unknown'}`,
  ].join('\n')

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string' && item.trim() !== '')
        .map((item) => item.trim().toLowerCase())
    : []

const toYear = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : null

/** Narrows the model's JSON to the fields we trust, discarding anything else. */
export const coerceQuery = (value: unknown): Partial<ArtworkQuery> | null => {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>

  return {
    terms: toStringArray(raw.terms),
    artists: toStringArray(raw.artists),
    mediums: toStringArray(raw.mediums),
    departments: toStringArray(raw.departments),
    tags: toStringArray(raw.tags),
    yearFrom: toYear(raw.yearFrom),
    yearTo: toYear(raw.yearTo),
  }
}

export type ClaudeInterpreterOptions = {
  vocabulary: CatalogVocabulary
  apiKey?: string
  model?: string
  client?: Pick<Anthropic['messages'], 'create'>
}

/**
 * Builds an interpreter backed by Claude, or returns `null` when no API key is
 * configured — which is how the feature degrades to "not there" rather than
 * "broken".
 */
export const createClaudeInterpreter = ({
  vocabulary,
  apiKey = process.env.ANTHROPIC_API_KEY,
  model = process.env.ANTHROPIC_MODEL || MODEL,
  client,
}: ClaudeInterpreterOptions): QueryInterpreter | null => {
  if (!client && !apiKey) return null

  const messages = client ?? new Anthropic({ apiKey }).messages

  return async (raw: string) => {
    const response = await messages.create({
      model,
      max_tokens: 1024,
      // The catalogue vocabulary is identical on every request, so it is worth
      // a cache breakpoint: the variable half is only the search phrase.
      system: [
        {
          type: 'text',
          text: systemPrompt(vocabulary),
          cache_control: { type: 'ephemeral' },
        },
      ],
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: SCHEMA as unknown as Record<string, unknown> },
      },
      messages: [{ role: 'user', content: raw }],
    })

    const text = response.content.find((block) => block.type === 'text')
    if (!text || text.type !== 'text') return null

    try {
      return coerceQuery(JSON.parse(text.text))
    } catch {
      return null
    }
  }
}

const interpretationCache = createTtlCache<ArtworkQuery>({
  ttlMs: Number(process.env.AI_SEARCH_CACHE_TTL_MS) || 15 * 60 * 1000,
  maxEntries: 500,
})

export const clearInterpretationCache = (): void => interpretationCache.clear()

export type InterpretOptions = {
  interpreter?: QueryInterpreter | null
  /** Set false to force the heuristic path even when a key is configured. */
  enabled?: boolean
}

/**
 * Produces the query the API will actually run. Always returns something: any
 * failure in the model path falls back to the heuristic parse.
 */
export const interpretSearch = async (
  raw: string,
  { interpreter, enabled = true }: InterpretOptions = {}
): Promise<Interpretation> => {
  const heuristic = parseQuery(raw)
  const trimmed = raw.trim()

  if (!enabled || !interpreter || !trimmed) {
    return { query: heuristic, interpretedBy: 'heuristic' }
  }

  try {
    const query = await interpretationCache.getOrCreate(trimmed.toLowerCase(), async () => {
      const suggestion = await interpreter(trimmed)
      if (!suggestion) throw new Error('no interpretation')
      return mergeQueries(heuristic, { ...heuristic, ...suggestion })
    })

    return { query, interpretedBy: 'model' }
  } catch (error) {
    // A model outage must never take search down with it.
    console.warn('[search] falling back to heuristic parsing:', (error as Error).message)
    return { query: heuristic, interpretedBy: 'heuristic' }
  }
}
