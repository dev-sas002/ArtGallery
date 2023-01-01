import {
  clearInterpretationCache,
  coerceQuery,
  createClaudeInterpreter,
  interpretSearch,
  MODEL,
  type QueryInterpreter,
} from '../../lib/search/interpret'

const VOCABULARY = {
  departments: ['European Paintings', 'Asian Art'],
  artists: ['Vincent van Gogh'],
  mediums: ['Paintings', 'Prints'],
}

const textResponse = (body: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(body) }],
})

/** Mirrors the single argument `messages.create` is called with. */
type CreateArgs = Record<string, unknown>
const createSpy = <T>(reply: () => T) => jest.fn((_request: CreateArgs) => Promise.resolve(reply()))

beforeEach(() => {
  clearInterpretationCache()
  delete process.env.ANTHROPIC_API_KEY
})

describe('coerceQuery', () => {
  it('keeps only well-typed fields and lower-cases the lists', () => {
    expect(
      coerceQuery({
        terms: ['Seascape', 42, ' '],
        artists: 'not-an-array',
        mediums: [],
        departments: ['Asian Art'],
        tags: ['Boats'],
        yearFrom: 1800.7,
        yearTo: 'nope',
        extra: 'dropped',
      })
    ).toEqual({
      terms: ['seascape'],
      artists: [],
      mediums: [],
      departments: ['asian art'],
      tags: ['boats'],
      yearFrom: 1800,
      yearTo: null,
    })
  })

  it.each([null, 'string', 7])('rejects %p', (value) => {
    expect(coerceQuery(value)).toBeNull()
  })
})

describe('createClaudeInterpreter', () => {
  it('is absent when no API key is configured', () => {
    expect(createClaudeInterpreter({ vocabulary: VOCABULARY })).toBeNull()
  })

  it('sends the catalogue vocabulary and a cache breakpoint, and parses the reply', async () => {
    const create = createSpy(() => textResponse({ terms: ['waves'], departments: ['asian art'] }))
    const interpreter = createClaudeInterpreter({
      vocabulary: VOCABULARY,
      client: { create } as never,
    })

    const result = await interpreter!('japanese prints of waves')

    expect(result).toMatchObject({ terms: ['waves'], departments: ['asian art'] })

    const request = create.mock.calls[0][0]
    expect(request).toMatchObject({ model: MODEL })
    expect(JSON.stringify(request.system)).toContain('Asian Art')
    expect(JSON.stringify(request.system)).toContain('ephemeral')
    expect(JSON.stringify(request.output_config)).toContain('json_schema')
  })

  it('honours ANTHROPIC_MODEL', async () => {
    const create = createSpy(() => textResponse({}))
    const interpreter = createClaudeInterpreter({
      vocabulary: VOCABULARY,
      model: 'claude-sonnet-5',
      client: { create } as never,
    })

    await interpreter!('anything')
    expect(create.mock.calls[0][0].model).toBe('claude-sonnet-5')
  })

  it.each([
    ['a reply with no text block', { content: [{ type: 'thinking' as const, thinking: '' }] }],
    ['unparseable JSON', { content: [{ type: 'text' as const, text: 'not json' }] }],
  ])('returns null for %s', async (_label, response) => {
    const interpreter = createClaudeInterpreter({
      vocabulary: VOCABULARY,
      client: { create: jest.fn(async () => response) } as never,
    })

    expect(await interpreter!('anything')).toBeNull()
  })
})

describe('interpretSearch', () => {
  const modelInterpreter: QueryInterpreter = async () => ({ tags: ['seascapes'] })

  it('uses the heuristic parser when no interpreter is available', async () => {
    const result = await interpretSearch('artist:monet before 1900')

    expect(result.interpretedBy).toBe('heuristic')
    expect(result.query.artists).toEqual(['monet'])
    expect(result.query.yearTo).toBe(1899)
  })

  it('uses the heuristic parser for a blank query even with an interpreter', async () => {
    const interpreter = jest.fn(modelInterpreter)

    expect(await interpretSearch('  ', { interpreter })).toMatchObject({
      interpretedBy: 'heuristic',
    })
    expect(interpreter).not.toHaveBeenCalled()
  })

  it('respects enabled: false', async () => {
    const interpreter = jest.fn(modelInterpreter)

    expect(await interpretSearch('boats', { interpreter, enabled: false })).toMatchObject({
      interpretedBy: 'heuristic',
    })
    expect(interpreter).not.toHaveBeenCalled()
  })

  it('layers the model result on top of the heuristic parse without losing literal words', async () => {
    const result = await interpretSearch('stormy boats', { interpreter: modelInterpreter })

    expect(result.interpretedBy).toBe('model')
    expect(result.query.terms).toEqual(['stormy', 'boats'])
    expect(result.query.tags).toEqual(['seascapes'])
  })

  it('caches by query string so a repeated search costs nothing', async () => {
    const interpreter = jest.fn(modelInterpreter)

    await interpretSearch('Stormy Boats', { interpreter })
    await interpretSearch('stormy boats', { interpreter })

    expect(interpreter).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['an interpreter with no opinion', async () => null],
    [
      'an interpreter that throws',
      async () => {
        throw new Error('upstream down')
      },
    ],
  ])('falls back to the heuristic parse for %s', async (_label, interpreter) => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await interpretSearch('boats', { interpreter: interpreter as QueryInterpreter })

    expect(result.interpretedBy).toBe('heuristic')
    expect(result.query.terms).toEqual(['boats'])
    expect(warn).toHaveBeenCalled()

    warn.mockRestore()
  })
})
